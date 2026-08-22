import type { IncomingMessage, ServerResponse } from "http";
import type { Express } from "express";
import { createApiApp } from "./app";

/**
 * Source for the Vercel serverless function. esbuild bundles this into
 * api/index.js at build time (see the build:vercel script).
 *
 * It must be bundled rather than shipped as TypeScript: package.json declares
 * "type": "module", so Vercel transpiles each api/*.ts file in place instead of
 * bundling it, and Node's ESM loader then cannot resolve the extensionless
 * relative imports this codebase uses throughout — the whole server/ tree ends
 * up missing from the function with ERR_MODULE_NOT_FOUND.
 *
 * No listen(), no port scan and no warmDb(): the platform owns the process
 * lifecycle. Static assets come from the CDN (see vercel.json).
 */

type ParsedRequest = IncomingMessage & { body?: unknown; _body?: boolean };

let app: Express | null = null;

export default function handler(req: ParsedRequest, res: ServerResponse) {
  try {
    if (!app) app = createApiApp();
  } catch (error) {
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
