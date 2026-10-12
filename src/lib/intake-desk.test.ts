import assert from "node:assert/strict";
import test from "node:test";
import { answerIntake, startIntake } from "./intake-desk.ts";

test("a customer question is sent to the assistant before the form starts", () => {
  const turn = answerIntake(startIntake().draft, "متریال تاتو آمریکاییه؟");
  assert.equal(turn.needsModel, true);
  assert.equal(turn.draft.step, "questions");
  assert.match(turn.after || "", /درخواست/);
  assert.equal(turn.payload, null);
});

test("the form starts only after the customer finishes asking", () => {
  const turn = answerIntake(startIntake().draft, "درخواست");
  assert.equal(turn.needsModel, undefined);
  assert.equal(turn.draft.step, "name");
  assert.match(turn.say.join(" "), /اسمت/);
});

test("a neck question stays a question and remembers the place", () => {
  const turn = answerIntake(startIntake().draft, "من میخوام رو گردنم تاتو بزنم امکانش هست");
  assert.equal(turn.needsModel, true);
  assert.equal(turn.draft.step, "questions");
  assert.equal(turn.draft.name, "");
  assert.equal(turn.draft.part, "گردن");
});

test("body place asks where, not for the name again", () => {
  let turn = answerIntake(startIntake().draft, "درخواست");
  for (const step of ["امیر حسینی", "09120000000", "pick:new"]) turn = answerIntake(turn.draft, step);
  assert.equal(turn.draft.step, "part");
  assert.match(turn.say.join(" "), /محل اجرا/);
  assert.doesNotMatch(turn.say.join(" "), /اسمت/);
});

test("exact centimeters are required and the request sends itself", () => {
  let turn = answerIntake(startIntake().draft, "درخواست");
  for (const step of ["امیر حسینی", "09120000000", "pick:new", "pick:ساعد", "pick:left"]) turn = answerIntake(turn.draft, step);
  assert.equal(turn.draft.step, "size");
  const vague = answerIntake(turn.draft, "pick:medium");
  assert.match(vague.say[0], /سانتی‌متر/);
  turn = answerIntake(turn.draft, "۱۰ در ۱۵");
  assert.equal(turn.draft.step, "design");
  const ready = answerIntake(turn.draft, "فرستادم", { design: true });
  assert.match(ready.payload?.sizeCm || "", /10×15/);
  assert.equal(ready.payload?.sizeMode, "cm");
  assert.equal(ready.payload?.placement, "ساعد، چپ");
});

test("cover-up cannot skip the tattoo already on the body", () => {
  let turn = answerIntake(startIntake().draft, "درخواست");
  for (const step of ["امیر حسینی", "09120000000", "pick:coverup", "pick:بازو", "pick:right", "۸ در ۱۲"]) {
    turn = answerIntake(turn.draft, step);
  }
  turn = answerIntake(turn.draft, "فرستادم", { design: true });
  assert.equal(turn.draft.step, "body");
  const skipped = answerIntake(turn.draft, "ندارم", { design: true });
  assert.match(skipped.say[0], /بدن/);
  assert.equal(skipped.payload, null);
  const sent = answerIntake(turn.draft, "فرستادم", { design: true, current: true });
  assert.equal(sent.payload?.placement, "بازو، راست");
});
