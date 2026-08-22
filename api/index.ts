import type { IncomingMessage, ServerResponse } from "http";
import { createApiApp } from "../server/_core/app";

// Vercel serverless entry. Static assets are served by Vercel's CDN from
// dist/public (see vercel.json), so no serveStatic here — and no listen(),
// no port scan, no warmDb(): the platform owns the process lifecycle.
const app = createApiApp();

type ParsedRequest = IncomingMessage & { body?: unknown; _body?: boolean };

/**
 * The Vercel Node runtime reads and parses the request body before handing the
 * request to us, which leaves the stream consumed. express.json() would then
 * wait on a stream that never emits "end", the invocation hangs until it is
 * killed, and the client gets Vercel's plain-text "A server error has
 * occurred" page instead of JSON — which breaks every tRPC mutation.
 *
 * body-parser skips a request that is already marked as parsed, so flag it and
 * let the pre-parsed req.body through untouched. Locally req.body is undefined
 * and express parses the stream as usual.
 */
export default function handler(req: ParsedRequest, res: ServerResponse) {
  if (req.body !== undefined) {
    req._body = true;
  }
  return app(req as never, res as never);
}
