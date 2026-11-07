import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster, toast } from "sonner";
import { isLicenseLockedError } from "@/lib/pocket/license-gate";
import { PocketApp } from "@/components/pocket/app";
import "@/styles.css";
import "@/components/pocket/pocket.css";

// A gated write that nobody awaited still gets a clear, consistent explanation (never a silent failure).
window.addEventListener("unhandledrejection", (event) => {
  if (isLicenseLockedError(event.reason)) {
    event.preventDefault();
    toast.error(event.reason.message, { id: "pocket-license-locked" });
  }
});

const root = document.getElementById("root");
if (!root) throw new Error("root missing");

createRoot(root).render(
  <StrictMode>
    <PocketApp />
    <Toaster position="top-center" dir="rtl" richColors offset={16} />
  </StrictMode>,
);
