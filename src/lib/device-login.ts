const STORE_KEY = "tattoo.device-logins";
const LAST_KEY = "tattoo.device-login-last";

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

function readStore(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "{}") as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.length >= 8) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

/** Keep a successful email login on this phone only. Never sent to the server. */
export function rememberDeviceLogin(email: string, password: string) {
  if (typeof localStorage === "undefined") return;
  if (password.length < 8) return;
  const keys = keysFor(email);
  if (!keys.size) return;
  const store = readStore();
  for (const key of keys) store[key] = password;
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  localStorage.setItem(LAST_KEY, email.trim().toLowerCase());
}

export function savedDevicePassword(email: string) {
  const store = readStore();
  for (const key of keysFor(email)) {
    const found = store[key];
    if (found) return found;
  }
  return "";
}

export function lastDeviceLogin(): { email: string; password: string } | null {
  if (typeof localStorage === "undefined") return null;
  const email = localStorage.getItem(LAST_KEY) || "";
  const password = savedDevicePassword(email);
  if (!email || !password) return null;
  return { email, password };
}