import express, { type Express } from "express";
import fs from "fs";
import path from "path";

// Kept separate from vite.ts so the production entry never imports vite or any
// of the dev-only vite plugins (they live in devDependencies and are pruned by
// `pnpm install --prod`, which used to crash the server at boot).
export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath, { maxAge: "1d", etag: true }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
