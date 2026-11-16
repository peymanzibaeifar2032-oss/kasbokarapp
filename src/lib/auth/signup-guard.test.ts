import assert from "node:assert/strict";
import { test } from "node:test";
import { signUpBlockReason } from "./signup-guard.ts";

test("a dotted Gmail twin of the owner can never sign up", () => {
  assert.ok(signUpBlockReason("p.eymanzibaeifar2032@gmail.com", null));
  assert.ok(signUpBlockReason("PeymanZibaeifar2032@googlemail.com", null));
  assert.ok(signUpBlockReason("peymanzibaeifar2032@gmail.com", null));
});

test("a twin of any existing account is refused", () => {
  assert.ok(signUpBlockReason("a.li@gmail.com", "ali@gmail.com"));
  assert.ok(signUpBlockReason("peyman.zibaeifar2032@gmail.com", "peyman.zibaeifar2032@gmail.com"));
});

test("ordinary new addresses and the exact owner address (first time) are allowed", () => {
  assert.equal(signUpBlockReason("new.customer@gmail.com", null), null);
  assert.equal(signUpBlockReason("someone@yahoo.com", null), null);
  assert.equal(signUpBlockReason("peyman.zibaeifar2032@gmail.com", null), null);
  assert.equal(signUpBlockReason("not-an-email", null), null);
});
