import { Component, type ReactNode } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { GuideWidget } from "@/components/guide/widget";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "کسب‌وکار";

class QuietBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const Route = createRootRoute({
  errorComponent: function RootError() {
    return (
      <div dir="rtl" lang="fa" className="min-h-dvh bg-bg p-6 text-fg">
        <p className="text-sm">بارگذاری پنل انجام نشد.</p>
        <a href="/login?next=/dashboard" className="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm text-primary-fg">
          ورود / ثبت‌نام
        </a>
      </div>
    );
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "description", content: "کشف، رزرو و مدیریت کسب‌وکارهای نزدیک روی نقشه" },
      { name: "theme-color", content: "#1C3D52" },
      { name: "kasb-build", content: "nav-chrome-v1" },
      ...((process.env.GIT_SHA || process.env.BUILD_SHA)
        ? [{ name: "kasb-sha", content: (process.env.GIT_SHA || process.env.BUILD_SHA || "").trim() }]
        : []),
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="fa" dir="rtl" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});});}if(window.caches){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k);});});}if(!location.hostname.endsWith("kasbokarapp.com"))return;document.querySelectorAll('script[src*="grok-app-builder/extensions.js"],script[src*="netlify/scripts/hud"]').forEach(function(n){n.remove();});}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
          <QuietBoundary>
            <GuideWidget />
          </QuietBoundary>
          <QuietBoundary>
            <Toaster position="bottom-center" dir="rtl" richColors />
          </QuietBoundary>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
