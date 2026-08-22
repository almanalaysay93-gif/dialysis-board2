import "dotenv/config";
import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";

/**
 * Everything the HTTP app needs except the transport. Shared by the long-lived
 * node server (index.ts) and the serverless entry (api/index.ts), so neither
 * can drift from the other.
 */
export function createApiApp(): Express {
  const app = express();
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // TEMPORARY deployment diagnostic. Reports whether the required variables
  // are visible to the running function and which Vercel environment served
  // the request — booleans and names only, never any value. Remove once the
  // deployment is confirmed healthy.
  app.get("/api/diag", (_req, res) => {
    res.json({
      vercel: process.env.VERCEL === "1",
      vercelEnv: process.env.VERCEL_ENV ?? null,
      region: process.env.VERCEL_REGION ?? null,
      nodeVersion: process.version,
      nodeEnv: process.env.NODE_ENV ?? null,
      present: {
        JWT_SECRET: Boolean(process.env.JWT_SECRET),
        SUPABASE_DATABASE_URL_B64: Boolean(process.env.SUPABASE_DATABASE_URL_B64),
        DATABASE_URL: Boolean(process.env.DATABASE_URL),
      },
      // Names only, and only ones that could plausibly be a misspelling of the
      // two we need — enough to catch a typo or a stray space.
      lookalikeNames: Object.keys(process.env).filter(k =>
        /JWT|SECRET|SUPABASE|DATABASE|POSTGRES/i.test(k)
      ),
      // Every name that is not a known platform built-in, JSON-quoted so any
      // leading/trailing whitespace in the name is visible. Names only.
      customNames: Object.keys(process.env)
        .filter(
          k =>
            !/^(VERCEL|AWS|LAMBDA|_|NODE|PATH$|HOME$|LANG$|TZ$|PWD$|SHLVL$|TERM$|HOSTNAME$|EDITOR$|NOW_)/i.test(
              k
            )
        )
        .map(k => JSON.stringify(k))
        .sort(),
      totalEnvVars: Object.keys(process.env).length,
    });
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}
