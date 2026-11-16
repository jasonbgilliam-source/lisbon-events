// Local Supabase REST path adapter. No external requests or authentication services.
import http from 'node:http';
http.createServer((req, res) => {
  if (!req.url.startsWith('/rest/v1/')) { res.writeHead(404).end(); return; }
  delete req.headers.authorization; // Test REST runs as a local-only role, without JWT auth.
  const upstream = http.request({ hostname: '127.0.0.1', port: 54321,
    path: req.url.slice('/rest/v1'.length), method: req.method, headers: req.headers }, response => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    });
  upstream.on('error', () => res.writeHead(502).end());
  req.pipe(upstream);
}).listen(54322, '127.0.0.1');
