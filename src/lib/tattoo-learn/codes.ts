const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[\s-]+/g, "");
}

export function formatCode(raw: string) {
  const compact = normalizeCode(raw).replace(/^TT/, "");
  if (compact.length < 10) return raw.trim().toUpperCase();
  return `TT-${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 10)}`;
}

export function makeActivationCode(bytes: Uint8Array) {
  if (bytes.length < 10) throw new Error("کد ساخته نشد.");
  let body = "";
  for (let i = 0; i < 10; i += 1) body += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
  return `TT-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 10)}`;
}

export function randomActivationCode() {
  return makeActivationCode(crypto.getRandomValues(new Uint8Array(10)));
}

export function canAddDevice(used: number, max: number) {
  return used < max;
}
