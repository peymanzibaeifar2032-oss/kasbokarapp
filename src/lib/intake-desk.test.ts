import assert from "node:assert/strict";
import test from "node:test";
import { answerIntake, startIntake } from "./intake-desk.ts";

test("a vague size never reaches the inbox", () => {
  let turn = startIntake();
  turn = answerIntake(turn.draft, "امیر حسینی");
  turn = answerIntake(turn.draft, "09120000000");
  turn = answerIntake(turn.draft, "ندارم");
  turn = answerIntake(turn.draft, "ندارم");
  turn = answerIntake(turn.draft, "pick:new");
  turn = answerIntake(turn.draft, "pick:ساعد");
  turn = answerIntake(turn.draft, "pick:right");
  const vague = answerIntake(turn.draft, "متوسط");
  assert.equal(vague.payload, null);
  assert.match(vague.say[0], /سانتی‌متر/);
});

test("confirmation is required before a payload exists", () => {
  let turn = startIntake();
  const steps = [
    "امیر حسینی",
    "09120000000",
    "ندارم",
    "ندارم",
    "pick:new",
    "pick:ساعد",
    "pick:left",
    "۱۰ در ۱۵",
    "pick:realism",
    "pick:full",
    "پرتره پدر بدون هیچ نوشته‌ای",
    "ندارم",
  ];
  for (const step of steps) turn = answerIntake(turn.draft, step);
  assert.equal(turn.payload, null);
  assert.equal(turn.draft.step, "confirm");
  const sent = answerIntake(turn.draft, "pick:yes");
  assert.equal(sent.payload?.placement, "ساعد، چپ");
  assert.equal(sent.payload?.sizeCm, "10×15 سانتی‌متر");
  assert.match(sent.payload?.idea || "", /پرتره پدر/);
});

test("cover-up cannot skip the current tattoo photo", () => {
  let turn = startIntake();
  for (const step of ["امیر حسینی", "09120000000", "ندارم", "ندارم", "pick:coverup", "pick:بازو", "pick:right", "8 در 12"]) {
    turn = answerIntake(turn.draft, step);
  }
  turn = answerIntake(turn.draft, "pick:blackwork");
  turn = answerIntake(turn.draft, "pick:blackgrey");
  turn = answerIntake(turn.draft, "کاور نوشته قدیمی که رنگش رفته است");
  const skipped = answerIntake(turn.draft, "ندارم");
  assert.equal(skipped.payload, null);
  assert.match(skipped.say[0], /عکس/);
});
