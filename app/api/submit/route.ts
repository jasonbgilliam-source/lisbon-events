// app/api/submit/route.ts
// Backwards-compatible alias for the public submission endpoint.
// Prefer POST /api/submit-event going forward.
export { POST, dynamic, revalidate } from "../submit-event/route";
