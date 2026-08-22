import type { IncomingMessage, ServerResponse } from "http";
import type { Express } from "express";

// Vercel serverless entry. Static assets are served by Vercel's CDN from
// dist/public (see vercel.json), so no serveStatic here — and no listen(),
// no port scan, no warmDb(): the platform owns the process lifecycle.

type ParsedRequest = IncomingMessage & { body?: unknown; _body?: boolean };

// The app is built lazily inside the handler rather than at module scope. If
// anything throws while loading the router graph (a bad import, a missing
// dependency, a module-scope crash) the platform would otherwise kill the
// invocation and serve its own plain-text "A server error has occurred" page,
// which tells the client nothing and is not even valid JSON. Catching it here
// turns that into a readable response.
let appPromise: Promise<Express> | null = null;

function loadApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = import("../server/_core/app").then(m => m.createApiApp());
  }
  return appPromise;
}

export default async function handler(req: ParsedRequest, res: ServerResponse) {
  let app: Express;
  try {
    app = await loadApp();
  } catch (error) {
    // Let the next invocation retry rather than caching the failure forever.
    appPromise = null;
    const err = error as Error;
    console.error("[api] failed to initialise:", err);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error: "API failed to initialise",
        name: err?.name ?? null,
        message: err?.message ?? String(error),
        stack: (err?.stack ?? "").split("\n").slice(0, 12),
      })
    );
    return;
  }

  // The Vercel Node runtime reads and parses the request body before handing
  // the request over, which leaves the stream consumed. express.json() would
  // then read it anyway and raw-body throws "stream is not readable".
  // body-parser skips a request already marked as parsed, so flag it and let
  // the pre-parsed req.body through. Locally req.body is undefined and express
  // parses the stream as usual.
  if (req.body !== undefined) {
    req._body = true;
  }

  return app(req as never, res as never);
}
