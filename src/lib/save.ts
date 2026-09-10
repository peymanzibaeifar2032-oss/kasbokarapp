import { getBearerToken } from "@/lib/auth/client";

export function friendlyError(raw: unknown) {
  const s =
    typeof raw === "string"
      ? raw
      : raw instanceof Error
        ? raw.message
        : raw && typeof raw === "object" && "error" in raw && typeof (raw as { error: unknown }).error === "string"
          ? (raw as { error: string }).error
          : "";
  if (/content-type|Invariant failed|Failed to fetch|NetworkError|Load failed|fetch/i.test(s)) {
    return "ارتباط با سرور برقرار نشد. دوباره بزنید.";
  }
  if (/Unauthorized/i.test(s)) return "لطفاً دوباره با ایمیل وارد شوید.";
  if (/Forbidden|cross-site/i.test(s)) return "این درخواست مجاز نیست.";
  return s.trim() || "انجام نشد. دوباره تلاش کنید.";
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text.slice(0, 180) };
  }
}

export async function saveAction<T = unknown>(type: string, payload: unknown = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = getBearerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch("/api/save", {
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
  if (!res.ok) {
    throw new Error(friendlyError(data));
  }
  return data as T;
}
