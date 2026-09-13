import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compactFa, placeContext, placeMatchesQuery } from "./places.ts";

describe("iran location matching", () => {
  it("matches اسلام‌آباد غرب to official اسلام آبادغرب", () => {
    assert.equal(placeMatchesQuery("اسلام آبادغرب", "اسلام‌آباد غرب"), true);
    assert.equal(placeMatchesQuery("اسلام آبادغرب", "اسلام آباد غرب"), true);
    assert.equal(compactFa("اسلام‌آباد غرب"), compactFa("اسلام آبادغرب"));
  });

  it("matches پاوه and سنقر as county names", () => {
    assert.equal(placeMatchesQuery("پاوه", "پاوه"), true);
    assert.equal(placeMatchesQuery("سنقر", "سنقر"), true);
  });

  it("normalizes Arabic kaf/yeh", () => {
    assert.equal(placeMatchesQuery("کردستان", "كردستان"), true);
    assert.equal(placeMatchesQuery("کرمانشاه", "كرمانشاه"), true);
  });

  it("builds disambiguation context", () => {
    assert.equal(
      placeContext({
        id: "c0501",
        nameFa: "اسلام آبادغرب",
        type: "county",
        provinceId: "p05",
        countyId: "c0501",
        districtId: null,
        ruralDistrictId: null,
        parentId: "p05",
        provinceName: "کرمانشاه",
      }),
      "اسلام آبادغرب — کرمانشاه",
    );
    assert.equal(
      placeContext({
        id: "v1",
        nameFa: "خانه‌ور",
        type: "village",
        provinceId: "p05",
        countyId: "c0501",
        districtId: "d1",
        ruralDistrictId: "r1",
        parentId: "r1",
        provinceName: "کرمانشاه",
        countyName: "اسلام آبادغرب",
        districtName: "مرکزی",
      }),
      "خانه‌ور — مرکزی، اسلام آبادغرب، کرمانشاه",
    );
  });
});
