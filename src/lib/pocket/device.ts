const INSTALL_KEY = "pocket.install.id.v1";
const EMAIL_KEY = "pocket.account.email.v1";

function randomInstallId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `inst-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function getOrCreateInstallId() {
  if (typeof localStorage === "undefined") return randomInstallId();
  const existing = localStorage.getItem(INSTALL_KEY);
  if (existing && existing.length >= 16) return existing;
  const id = randomInstallId();
  localStorage.setItem(INSTALL_KEY, id);
  return id;
}

export function readAccountEmail() {
  if (typeof localStorage === "undefined") return "";
  return (localStorage.getItem(EMAIL_KEY) || "").trim().toLowerCase();
}

export function writeAccountEmail(email: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
}
