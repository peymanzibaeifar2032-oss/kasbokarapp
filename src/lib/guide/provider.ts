export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export type LlmResult = { ok: true; text: string } | { ok: false; error: string; unavailable?: boolean };

export type LlmProvider = {
  id: string;
  complete: (messages: LlmMessage[], opts?: { maxTokens?: number }) => Promise<LlmResult>;
};

function xaiProvider(): LlmProvider {
  return {
    id: "xai",
    async complete(messages, opts) {
      const apiKey = process.env.XAI_API_KEY?.trim();
      if (!apiKey) return { ok: false, error: "AI is not available", unavailable: true };
      try {
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4.5",
            temperature: 0.2,
            max_tokens: opts?.maxTokens ?? 500,
            messages,
          }),
        });
        if (!res.ok) {
          const unavailable = res.status >= 500 || res.status === 429;
          return { ok: false, error: `xAI ${res.status}`, unavailable };
        }
        const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const text = body.choices?.[0]?.message?.content?.trim() ?? "";
        if (!text) return { ok: false, error: "empty", unavailable: true };
        return { ok: true, text };
      } catch {
        return { ok: false, error: "network", unavailable: true };
      }
    },
  };
}

/** Swap this factory to change providers without touching the chat UI. */
export function getLlmProvider(): LlmProvider {
  return xaiProvider();
}
