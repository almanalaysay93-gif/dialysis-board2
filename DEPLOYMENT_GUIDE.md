# Deployment Guide - Hemodialysis Occupancy Board

This guide provides instructions for deploying this full-stack application (React/Vite client, Node/Express server, and Supabase PostgreSQL database) to production using **Vercel**, **Render**, or **Railway**.

> **Do not set `NODE_ENV=production` as a build-time environment variable.** The
> build needs the devDependencies (vite, esbuild, tailwind). Setting `NODE_ENV`
> in the hosting dashboard makes the package manager prune them during install,
> and the build fails with `vite: not found`. `render.yaml` and the Dockerfile
> set it on the **start** command instead, which is the correct place. Vercel
> sets it for you and needs no `NODE_ENV` variable at all.

---

## Prerequisites

Before starting, make sure you have:
1. A **GitHub** account hosting this repository.
2. A **Supabase** account with an active PostgreSQL database.
3. A **Vercel**, **Render**, or **Railway** account for application hosting.

---

## 1. Database Setup (Supabase)

If you are using your existing Supabase database, the tables and schema are already created and migrated. If you are setting up a **new** Supabase database, follow these steps:

1. Create a new project in Supabase.
2. Obtain your **Transaction Connection String** from the database settings (Settings > Database > Connection string > URI).
3. The connection string looks like this:
   `postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`
4. Run migrations locally from this project directory by running:
   ```bash
   # Set the environment variable and push the schema
   DATABASE_URL="your-supabase-connection-string" pnpm db:push
   ```
5. Seed the database with the initial floor plans (160 machines) and default staff credentials:
   ```bash
   DATABASE_URL="your-supabase-connection-string" pnpm db:seed
   ```

---

## 2. Option A: Deploying to Vercel

Vercel serves the built client from its CDN and runs the Express API as a
serverless function (`api/index.ts`). `vercel.json` already configures this —
build command, output directory, and the rewrites that route `/api/trpc/*`,
`/api/oauth/*` and `/manus-storage/*` into the function, with everything else
falling back to `index.html` for the SPA router.

1. Log in to [Vercel](https://vercel.com/) and click **Add New… > Project**.
2. Import this GitHub repository. Leave the framework preset as **Other** —
   `vercel.json` supplies the build settings, so do not override them.
3. Open **Settings > Environment Variables** and add, for **all** environments:
    *   **`JWT_SECRET`**: a long random string. **Required** — staff login throws
        without it. Generate one with
        `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
    *   **`SUPABASE_DATABASE_URL_B64`**: your Supabase connection string, Base64
        encoded (recommended), **or** **`DATABASE_URL`** in plain text.
    *   Do **not** add `NODE_ENV` or `PORT`. Vercel manages both; `NODE_ENV`
        will break the build (see the warning at the top of this guide).
4. Click **Deploy**.

### Vercel caveats

*   **Use the Supabase transaction pooler URL** (port `6543`), not the direct
    connection. Serverless opens many short-lived connections; the pool is
    capped at 2 per instance on Vercel, but the direct connection will still
    exhaust the database under load.
*   **Images need no configuration.** The SKTI seal and building photo are
    served straight from `client/public/`, so `BUILT_IN_FORGE_API_URL` and
    `BUILT_IN_FORGE_API_KEY` are not required. The `/manus-storage/*` proxy is
    still mounted for future uploads but nothing in the client calls it.
*   **OAuth is optional.** Without `OAUTH_SERVER_URL` the server logs a startup
    warning and the `/api/oauth/callback` route is inert. Staff username and
    password login is unaffected.
*   Cold starts add roughly a second to the first request after idle. Render
    keeps a warm process and avoids this.

---

## 3. Option B: Deploying to Render

Render offers free web service hosting and supports automatic deployments directly linked to your GitHub repository.

### One-Click Blueprint Deployment (easiest)
1. Log in to [Render](https://dashboard.render.com/).
2. Click **New +** in the top navigation bar and select **Blueprint**.
3. Connect your GitHub account and select the `dialysis-occupancy-board` repository.
4. Render will automatically read the `render.yaml` blueprint file in the repository.
5. In the configuration page, provide the following environment variables:
   *   **`SUPABASE_DATABASE_URL_B64`**: Paste your Supabase connection string encoded in Base64 (recommended to avoid URL parsing issues).
       *   *To encode on Windows PowerShell:* `[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("your_connection_string"))`
       *   *To encode on Mac/Linux:* `echo -n "your_connection_string" | base64`
   *   **`DATABASE_URL`**: Alternatively, paste your connection string in plain text.
   *   **`JWT_SECRET`**: Leave blank, Render will generate a random secure key for you.
6. Click **Approve** to deploy. Render will automatically build the client and start the server.

### Manual Web Service Setup
If you prefer to configure the Web Service manually:
1. In the Render Dashboard, click **New +** and select **Web Service**.
2. Connect your GitHub repository.
3. Configure the following service settings:
   *   **Name**: `dialysis-occupancy-board`
   *   **Runtime**: `Node`
   *   **Build Command**: `pnpm install && pnpm run build`
   *   **Start Command**: `NODE_ENV=production pnpm start`
4. Scroll down, click **Advanced**, and add the following **Environment Variables**:
   *   `PORT`: `3000`
   *   `JWT_SECRET`: (Generate a long random string)
   *   `SUPABASE_DATABASE_URL_B64` (Base64 encoded string) or `DATABASE_URL` (plain text string)
5. Click **Create Web Service**.

---

## 4. Option C: Deploying to Railway

Railway is a developer-friendly platform that will automatically detect the `Dockerfile` in the repository and build it as a container.

1. Log in to [Railway](https://railway.app/).
2. Click **New Project** > **Deploy from GitHub repo**.
3. Select the `dialysis-occupancy-board` repository.
4. Click **Variables** in your service panel and add:
   *   `NODE_ENV`: `production`
   *   `JWT_SECRET`: (Generate a long random string)
   *   `SUPABASE_DATABASE_URL_B64`: (Base64 encoded Supabase URL) OR `DATABASE_URL`: (Plain-text connection string)
   *   `PORT`: `3000`
5. Railway will automatically build the container and deploy the app.

---

## Environment Variables Reference

| Variable Name | Required? | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | No | Set on the **start** command, never as a build-time dashboard variable (it prunes the devDependencies the build needs). Vercel sets it automatically. |
| `PORT` | No | The port the server binds to (default: `3000`). |
| `JWT_SECRET` | Yes | A secret key used to sign and verify staff cookies. Keep this private. |
| `SUPABASE_DATABASE_URL_B64` | Recommended | Base64-encoded Postgres connection URL. Bypasses proxy URL mangling. |
| `DATABASE_URL` | Fallback | Plain-text Postgres connection string (e.g., `postgresql://...`). |
