import { getBearerToken } from "@/lib/auth/client";
import { friendlyError } from "@/lib/save";

export type GuideChatResponse = {
  reply: string;
  mode: "help" | "out_of_scope" | "bug_collect" | "faq";
  oosStreak: number;
  locked: boolean;
  aiAvailable: boolean;
};

export type GuideBugListItem = {
  id: string;
  role: string;
  pageUrl: string;
  routePath: string | null;
  intent: string;
  expected: string;
  actual: string;
  device: string | null;
  browser: string | null;
  steps: string | null;
  severity: string;
  status: string;
  reproducible: boolean | null;
  appVersion: string | null;
  createdAt: string;
  userId: string | null;
  reporterEmail: string | null;
  conversationId: string | null;
  attachmentUrl: string | null;
  notifiedAt: string | null;
};


async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text.slice(0, 180) };
  }
}

export async function guideRequest<T = unknown>(type: string, payload: unknown = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = getBearerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch("/api/guide", {
      method: "POST",
      headers,
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({ type, payload }),
    });
  } catch (err) {
    throw new Error(friendlyError(err));
  }
  const data = await readBody(res);
  if (!res.ok) throw new Error(friendlyError(data));
  return data as T;
}
