import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isUniqueViolation, shouldGrantBootstrapAdmin } from "./admin-bootstrap.ts";

describe("admin bootstrap", () => {
  it("never grants admin when env is empty", () => {
    assert.equal(shouldGrantBootstrapAdmin("a@b.c", () => undefined), false);
    assert.equal(shouldGrantBootstrapAdmin("a@b.c", () => ""), false);
  });

  it("never grants admin just because the table is empty", () => {
    assert.equal(shouldGrantBootstrapAdmin(null, () => "ops@kasbokarapp.com"), false);
    assert.equal(shouldGrantBootstrapAdmin("", (k) => (k === "BOOTSTRAP_ADMIN_EMAIL" ? "ops@x.com" : undefined)), false);
  });

  it("grants only the matching bootstrap email", () => {
    const get = (k: string) => (k === "BOOTSTRAP_ADMIN_EMAIL" ? "Ops@Kasbokarapp.com" : undefined);
    assert.equal(shouldGrantBootstrapAdmin("ops@kasbokarapp.com", get), true);
    assert.equal(shouldGrantBootstrapAdmin("other@kasbokarapp.com", get), false);
  });
});

describe("unique violation", () => {
  it("detects postgres 23505", () => {
    assert.equal(isUniqueViolation({ code: "23505" }), true);
    assert.equal(isUniqueViolation({ message: "duplicate key value" }), true);
    assert.equal(isUniqueViolation({ code: "23503" }), false);
  });
});
