const STORE_KEY = "tattoo.device-logins";
const LAST_KEY = "tattoo.device-login-last";

type LoginBridge = {
  saveLogin?: (email: string, password: string) => void;
  savedLogin?: (email: string) => string;
  lastLogin?: () => string;
};

function keysFor(email: string) {
  const raw = email.trim().toLowerCase();
  const keys = new Set<string>();
  if (!raw.includes("@")) return keys;
  keys.add(raw);
  const at = raw.lastIndexOf("@");
  const domain = raw.slice(at + 1).replace(/^googlemail\.com$/, "gmail.com");
  if (domain === "gmail.com") {
    const local = raw.slice(0, at).replace(/\./g, "").split("+")[0];
    if (local) keys.add(`${local}@gmail.com`);
  }
  return keys;
}

function bridge(): LoginBridge | null {
  if (typeof window === "undefined") return null;
  const native = (window as Window & { AndroidApp?: LoginBridge }).AndroidApp;
  return native?.saveLogin ? native : null;
}

/**
 * Older builds kept typed passwords in plain text in this browser's localStorage,
 * where any injected script or anyone using the phone's browser could read them.
 * Passwords now live only in the Android app's native (encrypted) store; plain
 * browsers rely on their own password manager. Remove any copy left behind.
 */
export function purgeBrowserPasswords() {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(STORE_KEY);
  } catch {
    /* storage blocked */
  }
}

/** Keep a successful email login in the Android app's native store only. Never sent to the server. */
export function rememberDeviceLogin(email: string, password: string) {
  purgeBrowserPasswords();
  if (password.length < 8) return;
  if (!keysFor(email).size) return;
  try {
    bridge()?.saveLogin?.(email, password);
  } catch {
    /* older app builds have no native store */
  }
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(LAST_KEY, email.trim().toLowerCase());
  } catch {
    /* storage blocked */
  }
}

export function savedDevicePassword(email: string) {
  purgeBrowserPasswords();
  try {
    const native = bridge()?.savedLogin?.(email) || "";
    if (native.length >= 8) return native;
  } catch {
    /* older app builds have no native store */
  }
  return "";
}

export function lastDeviceLogin(): { email: string; password: string } | null {
  try {
    const raw = bridge()?.lastLogin?.() || "";
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as { email?: string; password?: string };
      if (parsed.email && parsed.password && parsed.password.length >= 8) {
        return { email: parsed.email, password: parsed.password };
      }
    }
  } catch {
    /* older app builds have no native store */
  }
  if (typeof localStorage === "undefined") return null;
  const email = localStorage.getItem(LAST_KEY) || "";
  const password = savedDevicePassword(email);
  if (!email || !password) return null;
  return { email, password };
}