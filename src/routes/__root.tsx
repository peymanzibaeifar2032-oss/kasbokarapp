import { Component, useEffect, type ReactNode } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import appCss from "../styles.css?url";

const APP_NAME = "رزرو وقت تاتو";

class QuietBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function CanonicalHost() {
  useEffect(() => {
    if (window.location.hostname !== "www.kasbokarapp.com") return;
    window.location.replace(
      `https://kasbokarapp.com${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  }, []);
  return null;
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
      { name: "description", content: "رزرو وقت تاتو نزد پیمان زیبائی‌فر در کرمانشاه" },
      { name: "theme-color", content: "#1C3D52" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "رزرو وقت تاتو" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black" },
      { name: "kasb-build", content: "map-nav-v1" },
      { property: "og:title", content: APP_NAME },
      { property: "og:site_name", content: APP_NAME },
      { property: "og:description", content: "رزرو وقت تاتو نزد پیمان زیبائی‌فر در کرمانشاه" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://kasbokarapp.com/og.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: APP_NAME },
      ...((process.env.GIT_SHA || process.env.BUILD_SHA)
        ? [{ name: "kasb-sha", content: (process.env.GIT_SHA || process.env.BUILD_SHA || "").trim() }]
        : []),
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apps/tattoo-app-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: () => (
    <html lang="fa" dir="rtl" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <CanonicalHost />
        <AuthProvider>
          <Outlet />
          <QuietBoundary>
            <Toaster position="bottom-center" dir="rtl" richColors />
          </QuietBoundary>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
