import type { PocketCustomField } from "../pocket-book.ts";
const key = "pocket.custom-field-schema.v1";
export function readCustomFieldTemplate(professionId: string): PocketCustomField[] {
  try {
    const map = JSON.parse(localStorage.getItem(key) || "{}");
    const list = map[professionId];
    if (!Array.isArray(list)) return [];
    return list
      .slice(0, 40)
      .filter((f) => f && typeof f.id === "string" && typeof f.label === "string")
      .map((f) => ({
        id: f.id.slice(0, 120),
        label: f.label.slice(0, 120),
        kind: "text",
        value: "",
      }));
  } catch {
    return [];
  }
}
export function saveCustomFieldTemplate(professionId: string, fields: PocketCustomField[]) {
  const map = JSON.parse(localStorage.getItem(key) || "{}");
  const next = Object.fromEntries(
    Object.entries(map).filter(([id]) => !["__proto__", "prototype", "constructor"].includes(id)),
  );
  next[professionId] = fields
    .filter((f) => f.label.trim())
    .map((f) => ({ id: f.id, label: f.label.trim(), kind: "text" }));
  localStorage.setItem(key, JSON.stringify(next));
}
