import assert from "node:assert/strict";
import test from "node:test";
import { cleanAssistantAnswer, tattooAssistantPrompt } from "./tattoo-assistant.ts";

test("the assistant is told the studio facts and must not price the tattoo", () => {
  const prompt = tattooAssistantPrompt();
  assert.match(prompt, /آمریکایی/);
  assert.match(prompt, /09216812852/);
  assert.match(prompt, /قیمت/);
});

test("a made-up price is removed from the answer", () => {
  assert.match(cleanAssistantAnswer("این کار حدود ۱۲ میلیون تومان می‌شود."), /عدد قیمت/);
});
