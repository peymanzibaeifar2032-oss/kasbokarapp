export type GuideAudience = "guest" | "user" | "owner" | "admin" | "all";

export type GuideChunk = {
  id: string;
  title: string;
  audience: GuideAudience[];
  tags: string[];
  body: string;
};

export function chunk(
  id: string,
  title: string,
  tags: string[],
  body: string,
  audience: GuideAudience[] = ["all"],
): GuideChunk {
  return { id, title, audience, tags, body };
}
