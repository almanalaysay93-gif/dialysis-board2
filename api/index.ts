import { createApiApp } from "../server/_core/app";

// Vercel serverless entry. Static assets are served by Vercel's CDN from
// dist/public (see vercel.json), so no serveStatic here — and no listen(),
// no port scan, no warmDb(): the platform owns the process lifecycle.
export default createApiApp();
