import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;
const saved: Record<string, string> = {};
const win = { AndroidApp: undefined as undefined | Record<string, unknown> };
(globalThis as unknown as { window: unknown }).window = win;

const { rememberDeviceLogin, savedDevicePassword, lastDeviceLogin } = await import("./device-login.ts");

beforeEach(() => {
  mem.clear();
  win.AndroidApp = undefined;
});

test("a plain browser never stores the password, and old copies are wiped", () => {
  mem.set("tattoo.device-logins", JSON.stringify({ "a@b.com": "oldpassword1" }));
  rememberDeviceLogin("a@b.com", "secret-pass-1");
  assert.equal(mem.has("tattoo.device-logins"), false);
  assert.equal([...mem.values()].some((v) => v.includes("secret-pass-1")), false);
  assert.equal(savedDevicePassword("a@b.com"), "");
  assert.equal(lastDeviceLogin(), null);
});

test("the Android app's native store still remembers the login", () => {
  win.AndroidApp = {
    saveLogin: (e: string, p: string) => void (saved[e] = p),
    savedLogin: (e: string) => saved[e] || "",
  };
  rememberDeviceLogin("c@d.com", "native-pass-1");
  assert.equal(saved["c@d.com"], "native-pass-1");
  assert.equal(savedDevicePassword("c@d.com"), "native-pass-1");
  assert.equal([...mem.values()].some((v) => v.includes("native-pass-1")), false);
});
