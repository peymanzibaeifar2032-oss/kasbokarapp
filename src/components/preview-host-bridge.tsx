/**
 * Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
 * (and later receive registered routes). Noops when the app is not embedded.
 */

import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  collectRoutePathsFromTree,
  installPreviewHostBridge,
} from "@/lib/preview-host-bridge";

declare const __KASB_SHA__: string;

export function PreviewHostBridge() {
  const router = useRouter();

  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const production = host === "kasbokarapp.com" || host === "www.kasbokarapp.com";
    if (production) {
      const kill = () => {
        document
          .querySelectorAll(
            'script[src*="grok-app-builder/extensions.js"],script[src*="grok.com"],script[src*="netlify/scripts/hud"],iframe[src*="grok-app-builder"],iframe[src*="grok.com"],iframe[src*="grok-sandbox.com"],iframe[src*="__grok-preview"],a[href*="grok.com/preview-auth"],a[href*="grok-sandbox.com"]',
          )
          .forEach((n) => n.remove());
      };
      kill();
      const obs = new MutationObserver(kill);
      obs.observe(document.documentElement, { childList: true, subtree: true });
      window.setTimeout(() => obs.disconnect(), 8000);
      if (typeof navigator !== "undefined" && navigator.serviceWorker) {
        void navigator.serviceWorker.getRegistrations().then((regs) => {
          for (const reg of regs) void reg.unregister();
        });
      }
      if (typeof caches !== "undefined") {
        void caches.keys().then((keys) => {
          for (const key of keys) void caches.delete(key);
        });
      }
      return () => obs.disconnect();
    }
    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
    }
    if (typeof caches !== "undefined") {
      void caches.keys().then((keys) => {
        for (const key of keys) void caches.delete(key);
      });
    }
    const built = typeof __KASB_SHA__ === "string" ? __KASB_SHA__ : "";
    if (built) {
      void fetch("/api/health", { cache: "no-store" })
        .then((r) => r.json() as Promise<{ sha?: string }>)
        .then((h) => {
          if (!h?.sha || h.sha === built) return;
          const u = new URL(window.location.href);
          if (u.searchParams.get("_kasb") === h.sha.slice(0, 12)) return;
          u.searchParams.set("_kasb", h.sha.slice(0, 12));
          window.location.replace(u.pathname + u.search + u.hash);
        })
        .catch(() => {});
    }
    return installPreviewHostBridge({
      navigate: (path) => {
        router.history.push(path);
      },
      getRoutePaths: () => collectRoutePathsFromTree(router.routeTree),
    });
  }, [router]);

  return null;
}
