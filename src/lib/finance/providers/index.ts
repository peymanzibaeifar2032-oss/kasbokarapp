import { vandarPayments, vandarSettlements, vandarStatus } from "./vandar.ts";
import type { PaymentProvider, SettlementProvider } from "./types.ts";

export function paymentProvider(): PaymentProvider {
  const name = (process.env.PAYMENTS_PROVIDER || "vandar").trim();
  if (name === "vandar") return vandarPayments;
  return vandarPayments;
}

export function settlementProvider(): SettlementProvider {
  return vandarSettlements;
}

export function paymentsEnabled() {
  return paymentProvider().isEnabled();
}

export { vandarStatus };
export type { PaymentProvider, SettlementProvider } from "./types.ts";
