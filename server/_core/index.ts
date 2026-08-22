import { createServer } from "http";
import net from "net";
import { createApiApp } from "./app";
import { serveStatic } from "./static";
import { warmDb } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = createApiApp();
  const server = createServer(app);

  // development mode uses Vite, production mode uses static files.
  // The vite import is dynamic (and esbuild --splitting keeps it in a separate
  // chunk) so production never resolves vite or its dev-only plugins.
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // A fixed PORT (Render, Docker, Fly) must be honoured exactly; only scan for
  // a free port during local development where 3000 is often taken.
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port =
    process.env.PORT && process.env.NODE_ENV !== "development"
      ? preferredPort
      : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Warm up the database connection pool eagerly so the first client requests
  // (e.g. the End of Day Report page) don't stall behind fresh TLS handshakes.
  void warmDb();
}

startServer().catch(console.error);
