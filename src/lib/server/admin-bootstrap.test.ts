import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isExclusionViolation,
  isOccupancyConflict,
  isUniqueViolation,
  shouldGrantBootstrapAdmin,
  shouldGrantPreviewStudioAdmin,
} from "./admin-bootstrap.ts";

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

  it("grants the studio owner even if Gmail dots differ", () => {
    const get = () => undefined;
    assert.equal(shouldGrantBootstrapAdmin("Peyman.zibaeifar2032@gmail.com", get), true);
    assert.equal(shouldGrantBootstrapAdmin("peymanzibaeifar2032@gmail.com", get), true);
    assert.equal(shouldGrantBootstrapAdmin("peyman.zibaeifar2032@googlemail.com", get), true);
    assert.equal(shouldGrantBootstrapAdmin("peyman.zibaeifar@yahoo.com", get), true);
    assert.equal(shouldGrantBootstrapAdmin("client@gmail.com", get), false);
  });

  it("grants studio admin only in the live preview", () => {
    assert.equal(shouldGrantPreviewStudioAdmin({ workspacePreview: true, standalone: false }), true);
    assert.equal(shouldGrantPreviewStudioAdmin({ workspacePreview: true, standalone: true }), false);
    assert.equal(shouldGrantPreviewStudioAdmin({ workspacePreview: false, standalone: false }), false);
  });
});

describe("unique violation", () => {
  it("detects postgres 23505", () => {
    assert.equal(isUniqueViolation({ code: "23505" }), true);
    assert.equal(isUniqueViolation({ message: "duplicate key value" }), true);
    assert.equal(isUniqueViolation({ code: "23503" }), false);
  });
});

describe("occupancy conflict", () => {
  it("detects exclusion 23P01 separately from unique", () => {
    assert.equal(isExclusionViolation({ code: "23P01" }), true);
    assert.equal(isExclusionViolation({ message: "booking overlap" }), true);
    assert.equal(isExclusionViolation({ code: "23505" }), false);
    assert.equal(isOccupancyConflict({ code: "23P01" }), true);
    assert.equal(isOccupancyConflict({ code: "23505" }), true);
    assert.equal(isOccupancyConflict({ code: "23503" }), false);
  });
});
