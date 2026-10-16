import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyDownload, type PocketBooking } from "./pocket-book.ts";

const localOnly: PocketBooking = {
  id: "local-1",
  day: "1405-08-20",
  name: "تست محلی",
  phone: "09120000000",
  style: "خط",
  placement: "ساعد",
  time: "16:00",
  note: "",
  serverId: null,
  pinned: false,
};

describe("pocket calendar download", () => {
  it("keeps phone-only bookings and places server bookings on their day", () => {
    const next = applyDownload([localOnly], [
      {
        serverId: "job-1",
        day: "1405-08-16",
        time: "11:30",
        name: "مهدی",
        phone: "09121111111",
        style: "رئال",
        placement: "بازو",
      },
    ]);
    assert.equal(next.length, 2);
    assert.equal(next.find((row) => row.serverId === "job-1")?.day, "1405-08-16");
    assert.equal(next.find((row) => row.id === "local-1")?.name, "تست محلی");
  });

  it("does not move a booking the owner already edited offline", () => {
    const edited: PocketBooking = {
      id: "srv-job-1",
      serverId: "job-1",
      day: "1405-09-02",
      time: "18:00",
      name: "مهدی",
      phone: "09121111111",
      style: "رئال",
      placement: "ساق",
      note: "جابه‌جا شد",
      pinned: true,
    };
    const next = applyDownload([edited], [
      {
        serverId: "job-1",
        day: "1405-08-16",
        time: "11:30",
        name: "مهدی",
        phone: "09121111111",
        style: "رئال",
        placement: "بازو",
      },
    ]);
    assert.equal(next.length, 1);
    assert.equal(next[0]?.day, "1405-09-02");
    assert.equal(next[0]?.placement, "ساق");
  });
});
