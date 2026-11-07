import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PROFESSION_CATEGORIES, PROFESSION_PACKS, canRequestServerSync, getProfessionPack } from "./professions.ts";
import { pocketServerSyncAllowed } from "./sync-policy.ts";
import { summarizeCash } from "./cash-box.ts";
import { traineeBalance, traineeRemaining } from "./trainees.ts";

describe("pocket professions", () => {
  it("keeps tattoo artist exact Persian booking labels", () => {
    const pack = getProfessionPack("tattoo_artist");
    assert.equal(pack.appTitleFa, "تقویم نوبت تاتو");
    assert.equal(pack.traineesLabelFa, "هنرجوها");
    assert.equal(pack.cashLabelFa, "صندوق");
    assert.equal(pack.allowsServerSync, true);
    const labels = pack.fields.map((f) => f.labelFa);
    assert.deepEqual(labels, [
      "اسم مشتری",
      "موبایل",
      "طرح",
      "محل روی بدن",
      "ساعت",
      "اندازه طرح به سانتی‌متر",
      "قیمت به تومان",
      "عکس طرح",
      "یادداشت",
    ]);
  });

  it("covers categorized service professions", () => {
    assert.ok(PROFESSION_CATEGORIES.length >= 6);
    assert.ok(Object.keys(PROFESSION_PACKS).length >= 15);
    for (const cat of PROFESSION_CATEGORIES) {
      assert.ok(cat.professionIds.length > 0);
      for (const id of cat.professionIds) assert.equal(PROFESSION_PACKS[id].categoryId, cat.id);
    }
  });

  it("blocks server sync for non-tattoo professions", () => {
    assert.equal(canRequestServerSync("barber"), false);
    assert.equal(canRequestServerSync("doctor"), false);
    assert.equal(
      pocketServerSyncAllowed({ professionId: "tattoo_artist", accountEmail: "peyman.zibaeifar2032@gmail.com" }),
      true,
    );
    assert.equal(
      pocketServerSyncAllowed({ professionId: "tattoo_artist", accountEmail: "other@example.com" }),
      false,
    );
    assert.equal(
      pocketServerSyncAllowed({ professionId: "barber", accountEmail: "peyman.zibaeifar2032@gmail.com" }),
      false,
    );
  });

  it("summarizes cash and trainee progress offline", () => {
    const cash = summarizeCash([
      { id: "1", day: "1405-01-01", kind: "income", title: "a", amountToman: 1000, note: "", createdAt: "1" },
      { id: "2", day: "1405-01-01", kind: "expense", title: "b", amountToman: 300, note: "", createdAt: "2" },
    ]);
    assert.equal(cash.balance, 700);
    assert.equal(traineeRemaining(3, 12), 9);
    assert.equal(traineeBalance(5_000_000, 2_000_000), 3_000_000);
  });
});
