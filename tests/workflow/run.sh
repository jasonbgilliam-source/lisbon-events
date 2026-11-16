#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# Uses only disposable local containers. Fixed ports must be free.
node - <<'JS'
const net = require('node:net');
Promise.all([3100, 54321, 54322].map(port => new Promise((resolve, reject) => {
 const server = net.createServer();
 server.once('error', reject);
 server.listen(port, '127.0.0.1', () => server.close(resolve));
}))).catch(e => { console.error('Test ports must be free:', e.message); process.exit(1); });
JS
run_id="lisbon-workflow-$$"
log_dir=$(mktemp -d /tmp/lisbon-workflow-logs.XXXXXX)
proxy_pid=''
app_pid=''
cleanup() {
 status=$?
 trap - EXIT
 if [[ -n "$app_pid" ]]; then kill -- "-$app_pid" 2>/dev/null || true; fi
 if [[ -n "$proxy_pid" ]]; then kill "$proxy_pid" 2>/dev/null || true; fi
 docker rm -f "$run_id-rest" "$run_id-db" >/dev/null 2>&1 || true
 docker network rm "$run_id" >/dev/null 2>&1 || true
 echo "Workflow logs: $log_dir"
 exit "$status"
}
trap cleanup EXIT
# Pinned images; no production database, cloud provisioning or paid APIs.
pg_image='postgres:16-alpine@sha256:81e77a4833487b8132fe4b00bedd39dc3f74b8641e387f19312a48f7de218c2e'
rest_image='postgrest/postgrest:v12.2.12@sha256:5f4ce744539bbba786b4e24dbbd95bdb2a956dcf568c5374995a0ff4a68f5bd2'
docker network create "$run_id" >/dev/null
docker run -d --name "$run_id-db" --network "$run_id" -e POSTGRES_PASSWORD=local-test-only -e POSTGRES_DB=lisbon_test "$pg_image" >/dev/null
for ((i=0; i<60; i++)); do
 if docker exec "$run_id-db" pg_isready -h 127.0.0.1 -U postgres -d lisbon_test >/dev/null 2>&1; then break; fi
 sleep 1
done
docker exec -i "$run_id-db" psql -h 127.0.0.1 -U postgres -d lisbon_test -v ON_ERROR_STOP=1 < tests/workflow/schema.sql
docker exec -i "$run_id-db" psql -h 127.0.0.1 -U postgres -d lisbon_test -v ON_ERROR_STOP=1 < sql/series-occurrences.sql
# Bind to loopback only. This test role bypasses RLS; see README for coverage limits.
docker run -d --name "$run_id-rest" --network "$run_id" -p 127.0.0.1:54321:3000 \
 -e "PGRST_DB_URI=postgres://postgres:local-test-only@$run_id-db:5432/lisbon_test" \
 -e PGRST_DB_ANON_ROLE=postgres -e PGRST_DB_SCHEMAS=public -e PGRST_DB_MAX_ROWS=1000 "$rest_image" >/dev/null
node tests/workflow/rest-proxy.mjs > "$log_dir/proxy.log" 2>&1 &
proxy_pid=$!
for ((i=0; i<60; i++)); do
 if curl -fsS http://127.0.0.1:54322/rest/v1/category_catalog >/dev/null 2>&1; then break; fi
 sleep 1
done
curl -fsS http://127.0.0.1:54322/rest/v1/category_catalog >/dev/null
# env -i prevents inherited production credentials from entering build or server.
# Run without .env files: Next loads them independently of the process environment.
if compgen -G '.env*' >/dev/null; then
 echo 'Run in a checkout without .env files; the test never loads production settings.' >&2
 exit 1
fi
test_env=(env -i "PATH=$PATH" NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54322 NEXT_PUBLIC_SUPABASE_ANON_KEY=local-test-only SUPABASE_SERVICE_ROLE_KEY=local-test-only ADMIN_API_TOKEN=local-admin-test-only NEXT_TELEMETRY_DISABLED=1)
"${test_env[@]}" npm run build > "$log_dir/build.log" 2>&1 || { cat "$log_dir/build.log"; exit 1; }
setsid "${test_env[@]}" node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100 > "$log_dir/app.log" 2>&1 &
app_pid=$!
for ((i=0; i<60; i++)); do
 if curl -fsS http://127.0.0.1:3100/api/ping/ >/dev/null 2>&1; then break; fi
 sleep 1
done
curl -fsS http://127.0.0.1:3100/api/ping/ >/dev/null
"${test_env[@]}" node tests/workflow/check.mjs

"${test_env[@]}" node tests/workflow/series-check.mjs
