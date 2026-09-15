/**
 * Production-inert placeholder so Nitro `serverDir: "./server"` still loads
 * `security-headers.ts`. Grok App Builder PWA / install / builder-script chrome
 * is Vite-preview only (`scripts/grok-pwa-plugin.mjs`) and must never run on
 * Kasbokar Production (STANDALONE).
 */
export default async function grokPwaMiddleware(
  _event: unknown,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  return next();
}
