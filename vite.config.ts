import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";
import { isMigrationFile } from "./scripts/migration-plan.mjs";

/**
 * Leaflet / react-leaflet touch `window` at import time. Nitro's production
 * build sets `noExternal: true`, so a dynamic `import("./leaflet-map")` still
 * lands in the SSR graph and can get chunked with `react-dom` — then every
 * page 500s. Stub those modules in server environments only; the client bundle
 * keeps the real map.
 */
function leafletSsrStubPlugin(): Plugin {
  const STUB = "\0virtual:leaflet-ssr-stub";
  const isLeafletId = (source: string) => {
    const id = source.replaceAll("\\", "/").split("?")[0] ?? source;
    return (
      id === "leaflet" ||
      id.startsWith("leaflet/") ||
      id === "react-leaflet" ||
      id.startsWith("react-leaflet/") ||
      id.startsWith("@react-leaflet/") ||
      /(^|\/)leaflet-map(\.tsx?)?$/.test(id)
    );
  };
  return {
    name: "leaflet-ssr-stub",
    enforce: "pre",
    applyToEnvironment(environment) {
      return environment.config.consumer === "server";
    },
    resolveId(source) {
      if (isLeafletId(source)) return STUB;
    },
    load(id) {
      if (id !== STUB) return;
      return `
export function LeafletMap() { return null; }
export default {};
export const MapContainer = () => null;
export const TileLayer = () => null;
export const Marker = () => null;
export const CircleMarker = () => null;
export const Popup = () => null;
export const useMap = () => ({ setView() {} });
export const useMapEvents = () => ({});
`;
    },
  };
}

/**
 * PGLite loads `pglite.wasm` / `pglite.data` / `initdb.wasm` next to its JS
 * (`new URL("./pglite.data", import.meta.url)`). Nitro inlines the JS but not
 * those binaries, so `vite preview` (no DATABASE_URL) crashes. Copy them next
 * to the bundled module. Deployed apps use Neon and never hit this path.
 */
function copyPgliteAssets() {
  const destDir = join(process.cwd(), ".vercel/output/functions/__server.func/_libs");
  if (!existsSync(destDir)) return;
  const srcDir = join(process.cwd(), "node_modules/@electric-sql/pglite/dist");
  mkdirSync(destDir, { recursive: true });
  for (const file of ["pglite.data", "pglite.wasm", "initdb.wasm"] as const) {
    const from = join(srcDir, file);
    if (existsSync(from)) copyFileSync(from, join(destDir, file));
  }
}

function copyPgliteAssetsPlugin(): Plugin {
  return {
    name: "copy-pglite-assets",
    apply: "build",
    closeBundle() {
      copyPgliteAssets();
    },
  };
}

/** The files `src/lib/db.ts` globs — same directory, same non-recursive scope. */
function hasGlobbedMigrations(root: string): boolean {
  try {
    return readdirSync(join(root, "migrations")).some(isMigrationFile);
  } catch {
    return false;
  }
}

/**
 * Finish PGLite bootstrap during dev-server setup (before traffic). Vite awaits
 * async `configureServer` hooks. Production: `src/lib/db` kicks `ensureDbReady`
 * on import.
 *
 * Vite awaiting the hook puts this on time-to-first-render, so an app with no
 * migrations — no schema to apply — skips it entirely rather than paying for a
 * PGLite instance it never queries.
 */
function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "app-builder:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      if (!hasGlobbedMigrations(server.config.root)) return;
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[app-builder] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

/**
 * Live-preview OAuth popup — handled HERE so the agent never has to create a
 * `/auth/popup` route (and cannot break it by scaffolding a React page that
 * paints the full app shell in the popup).
 *
 * `signIn` (client.ts) opens `/auth/popup?providerId=…` in a top-level window.
 * This middleware runs before TanStack Start, calls `handleAuthPopupRequest`,
 * and returns the 302 / completion HTML. Deployed apps do not use the popup
 * (full-page OAuth redirect), so `apply: "serve"` is enough.
 */
function authPopupPlugin(): Plugin {
  return {
    name: "app-builder:auth-popup",
    apply: "serve",
    configureServer(server) {
      // Register immediately (not in a returned post-hook) so we run BEFORE
      // TanStack Start / the SPA HTML fallback. A model-authored
      // `src/routes/auth/popup.tsx` React page must never win this path.
      server.middlewares.use(async (req, res, next) => {
        try {
          const rawUrl = req.url ?? "";
          const pathOnly = rawUrl.split("?", 1)[0] ?? "";
          if (pathOnly !== "/auth/popup") {
            next();
            return;
          }
          if ((req.method ?? "GET").toUpperCase() !== "GET") {
            res.statusCode = 405;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("Method Not Allowed");
            return;
          }

          const host = String(
            req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:8080",
          );
          const proto = String(
            req.headers["x-forwarded-proto"] ??
              ((req.socket as { encrypted?: boolean } | undefined)?.encrypted ? "https" : "http"),
          );
          const requestHeaders = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
              for (const v of value) requestHeaders.append(key, v);
            } else {
              requestHeaders.set(key, value);
            }
          }
          // Ensure Host is the public preview host so Better Auth's dynamic
          // baseURL / redirect_uri match the popup origin.
          if (!requestHeaders.has("host")) requestHeaders.set("host", host);

          const request = new Request(`${proto}://${host}${rawUrl}`, {
            method: "GET",
            headers: requestHeaders,
          });

          const mod = (await server.ssrLoadModule("/src/lib/auth/popup.server.ts")) as {
            handleAuthPopupRequest: (req: Request) => Promise<Response>;
          };
          const response = await mod.handleAuthPopupRequest(request);

          res.statusCode = response.status;
          // Preserve multiple Set-Cookie headers (OAuth state + session).
          const setCookies =
            typeof response.headers.getSetCookie === "function"
              ? response.headers.getSetCookie()
              : [];
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === "set-cookie") return;
            res.setHeader(key, value);
          });
          for (const cookie of setCookies) {
            res.appendHeader("set-cookie", cookie);
          }
          const body = Buffer.from(await response.arrayBuffer());
          res.end(body);
        } catch (err) {
          console.error("[app-builder] /auth/popup handler failed:", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("auth popup failed");
          }
        }
      });
    },
  };
}

const isNetlifyBuild =
  process.env.NITRO_PRESET === "netlify" || process.env.NETLIFY === "true";

// `0.0.0.0:8080` is the live-preview contract — don't change host/port.
// The dev server starts once `src/router.tsx` and `src/routes/` exist — see
// AGENTS.md § "First scaffold".
export default defineConfig(({ command, isPreview }) => ({
  define: {
    __KASB_SHA__: JSON.stringify(process.env.GIT_SHA || process.env.BUILD_SHA || ""),
  },
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    pgliteBootstrapPlugin(),
    leafletSsrStubPlugin(),
    copyPgliteAssetsPlugin(),
    // Before tanstackStart so /auth/popup never falls through to the SPA.
    authPopupPlugin(),
    // Dev-only /__app-env, read by scripts/check-auth-invariant.mjs.
    appEnvPlugin(),
    // PWA head + ?install=1 tutorial page; runs before Start/Nitro.
    grokPwaPlugin(),
    tailwindcss(),
    tanstackStart(),
    // Netlify production: official Start plugin (not Nitro). Local preview and
    // other hosts keep Nitro so this file still builds for Vercel/Docker.
    ...(command === "build" && isNetlifyBuild
      ? [netlify()]
      : command === "build" || isPreview
        ? [
            nitro({
              preset: process.env.NITRO_PRESET || "vercel",
              // Auto-registers server/middleware/* (the PWA install page +
              // manifest + head-tag middleware). Nitro v3 defaults serverDir to
              // false, so removing this silently unwires /?install=1 on deploys.
              serverDir: "./server",
              hooks: {
                compiled() {
                  copyPgliteAssets();
                },
              },
            }),
          ]
        : []),
    viteReact(),
  ],
}));
