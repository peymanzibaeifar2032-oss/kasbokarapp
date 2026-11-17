/** Shared rules for TattooHub posts. The feed never filters by the viewer. */

export const HUB_VERSION = "1.0.1";
export const MAX_IMAGE_CHARS = 480_000;

export type HubPost = {
  id: string;
  userId: string;
  caption: string;
  image: string;
  createdAt: number;
};

export function cleanText(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Gallery photos must already be a compressed data URL, never a raw file path. */
export function cleanImage(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  const match = /^data:image\/(jpeg|jpg|png|webp);base64,([a-z0-9+/=\s]+)$/i.exec(value);
  if (!match) throw new Error("فقط عکس گالری پذیرفته می‌شود.");
  const image = `data:image/jpeg;base64,${match[2].replace(/\s+/g, "")}`;
  if (image.length > MAX_IMAGE_CHARS) throw new Error("عکس بزرگ است. یک عکس کوچک‌تر از گالری انتخاب کن.");
  return image;
}

export function publish(posts: HubPost[], post: HubPost) {
  return [post, ...posts.filter((item) => item.id !== post.id)];
}

/** Every signed-in artist sees the same posts, including ones they did not write. */
export function visibleToEveryone(posts: HubPost[]) {
  return [...posts].sort((a, b) => b.createdAt - a.createdAt);
}
