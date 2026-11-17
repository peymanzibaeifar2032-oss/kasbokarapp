/** Shared rules for TattooHub. The feed never filters by the viewer. */

export const HUB_VERSION = "1.2.1";
export const MAX_IMAGE_CHARS = 480_000;
export const MAX_AUDIO_CHARS = 700_000;

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

export function cleanAudio(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  if (!/^data:audio\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(value)) throw new Error("ویس پذیرفته نشد.");
  if (value.length > MAX_AUDIO_CHARS) throw new Error("ویس طولانی است. کوتاه‌تر ضبط کن.");
  return value;
}

export function publish(posts: HubPost[], post: HubPost) {
  return [post, ...posts.filter((item) => item.id !== post.id)];
}

/** Every signed-in artist sees the same posts, including ones they did not write. */
export function visibleToEveryone(posts: HubPost[]) {
  return [...posts].sort((a, b) => b.createdAt - a.createdAt);
}

/** A new incoming message should ping unless that exact chat is already open. */
export function shouldNotify(previousId: string, nextId: string, threadOpen: boolean) {
  return Boolean(nextId) && nextId !== previousId && !threadOpen;
}

export type RankedPost = HubPost & { style?: string; likes?: number; saves?: number };

/** Following and matching styles outrank a merely popular old post. */
export function rankForYou(
  posts: RankedPost[],
  opts: { following: string[]; styles: string[] },
) {
  const followed = new Set(opts.following);
  const styles = new Set(opts.styles);
  return [...posts].sort((a, b) => score(b) - score(a) || b.createdAt - a.createdAt);

  function score(post: RankedPost) {
    const ageHours = Math.max(0, (Date.now() - post.createdAt) / 3_600_000);
    return (
      Math.max(0, 72 - ageHours) +
      (followed.has(post.userId) ? 50 : 0) +
      (post.style && styles.has(post.style) ? 30 : 0) +
      Math.min(24, post.likes || 0) +
      (post.saves || 0) * 4
    );
  }
}

export function canSeePractice(post: { userId: string; practice?: boolean; mentorId?: string }, viewerId: string) {
  if (!post.practice) return true;
  return post.userId === viewerId || post.mentorId === viewerId;
}

/** Taps on the reply bar or while typing must never advance a story. */
export function storyTap(where: "dock" | "edge", x: number, width: number, typing: boolean) {
  if (where === "dock" || typing) return "stay";
  return x < width / 2 ? "prev" : "next";
}


