import assert from "node:assert/strict";
import test from "node:test";
import { answerIntake, startIntake } from "./intake-desk.ts";

test("a customer question is answered without skipping the form", () => {
  const turn = answerIntake(startIntake().draft, "متریال تاتو آمریکاییه؟");
  assert.match(turn.say[0], /آمریکایی/);
  assert.match(turn.say[1], /اسمت/);
  assert.equal(turn.draft.step, "name");
  assert.equal(turn.payload, null);
});

test("calling the artist returns the studio number", () => {
  let turn = startIntake();
  turn = answerIntake(turn.draft, "امیر حسینی");
  turn = answerIntake(turn.draft, "شماره تماس آرتیست را می‌خواستم");
  assert.match(turn.say[0], /09216812852/);
  assert.equal(turn.draft.step, "phone");
});

test("a neck question is answered and is not saved as the customer name", () => {
  const turn = answerIntake(startIntake().draft, "من میخوام رو گردنم تاتو بزنم امکانش هست");
  assert.match(turn.say[0], /گردن/);
  assert.match(turn.say[0], /پیمان/);
  assert.equal(turn.draft.step, "name");
  assert.equal(turn.draft.name, "");
  assert.equal(turn.draft.part, "گردن");
  assert.equal(turn.payload, null);
});

test("approximate size is enough and a new tattoo still needs the design photo", () => {
  let turn = startIntake();
  for (const step of ["امیر حسینی", "09120000000", "pick:new", "pick:ساعد", "pick:left", "pick:medium"]) {
    turn = answerIntake(turn.draft, step);
  }
  assert.equal(turn.draft.step, "design");
  const blocked = answerIntake(turn.draft, "ندارم");
  assert.match(blocked.say[0], /عکس/);
  const ready = answerIntake(turn.draft, "فرستادم", { design: true });
  assert.equal(ready.draft.step, "confirm");
  const sent = answerIntake(ready.draft, "pick:yes", { design: true });
  assert.match(sent.payload?.sizeCm || "", /تقریبی/);
  assert.equal(sent.payload?.placement, "ساعد، چپ");
});

test("cover-up cannot skip the tattoo already on the body", () => {
  let turn = startIntake();
  for (const step of ["امیر حسینی", "09120000000", "pick:coverup", "pick:بازو", "pick:right", "۸ در ۱۲"]) {
    turn = answerIntake(turn.draft, step);
  }
  turn = answerIntake(turn.draft, "فرستادم", { design: true });
  assert.equal(turn.draft.step, "body");
  const skipped = answerIntake(turn.draft, "ندارم", { design: true });
  assert.match(skipped.say[0], /بدن/);
  assert.equal(skipped.payload, null);
});
