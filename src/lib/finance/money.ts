/** Canonical money unit is IRR (Rial) integer. UI displays Toman. 1 Toman = 10 IRR. */

export const TOMAN_PER_IRR = 10;

export function assertInt(n: number, label = "amount") {
  if (!Number.isInteger(n) || n < 0) throw new Error(`${label} must be a non-negative integer`);
}

export function tomanToIrr(toman: number) {
  assertInt(toman, "toman");
  return toman * TOMAN_PER_IRR;
}

export function irrToToman(irr: number) {
  assertInt(irr, "irr");
  if (irr % TOMAN_PER_IRR !== 0) throw new Error("IRR amount is not aligned to Toman");
  return irr / TOMAN_PER_IRR;
}

export function formatTomanFromIrr(irr: number) {
  const toman = irrToToman(irr);
  return `${new Intl.NumberFormat("fa-IR").format(toman)} تومان`;
}

export function percentBps(amountIrr: number, bps: number) {
  assertInt(amountIrr, "amount");
  assertInt(bps, "bps");
  return Math.floor((amountIrr * bps) / 10_000);
}
