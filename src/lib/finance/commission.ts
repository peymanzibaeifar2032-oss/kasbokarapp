import { percentBps } from "./money.ts";

export type CommissionRule = {
  id: string;
  scope: "platform" | "business" | "category" | "service";
  scopeId?: string | null;
  percentBps: number;
  fixedIrr: number;
  active: boolean;
};

export type CommissionSnapshot = {
  ruleId: string;
  scope: CommissionRule["scope"];
  percentBps: number;
  fixedIrr: number;
  grossIrr: number;
  commissionIrr: number;
  businessNetIrr: number;
  appliedAt: string;
};

const PRECEDENCE: CommissionRule["scope"][] = ["service", "category", "business", "platform"];

export function pickCommissionRule(
  rules: CommissionRule[],
  ctx: { businessId: string; categoryId?: number | null; serviceTitle?: string | null },
): CommissionRule {
  const active = rules.filter((r) => r.active);
  for (const scope of PRECEDENCE) {
    const hit = active.find((r) => {
      if (r.scope !== scope) return false;
      if (scope === "platform") return true;
      if (scope === "business") return r.scopeId === ctx.businessId;
      if (scope === "category") return r.scopeId === String(ctx.categoryId ?? "");
      if (scope === "service") return r.scopeId === `${ctx.businessId}:${ctx.serviceTitle ?? ""}`;
      return false;
    });
    if (hit) return hit;
  }
  return { id: "implicit-zero", scope: "platform", percentBps: 0, fixedIrr: 0, active: true };
}

export function applyCommission(grossIrr: number, rule: CommissionRule, at = new Date()): CommissionSnapshot {
  const commissionIrr = Math.min(grossIrr, percentBps(grossIrr, rule.percentBps) + rule.fixedIrr);
  return {
    ruleId: rule.id,
    scope: rule.scope,
    percentBps: rule.percentBps,
    fixedIrr: rule.fixedIrr,
    grossIrr,
    commissionIrr,
    businessNetIrr: grossIrr - commissionIrr,
    appliedAt: at.toISOString(),
  };
}

export function depositDueIrr(
  priceToman: number,
  policy: { depositType?: "none" | "fixed" | "percent"; depositAmount?: number; depositPercent?: number },
  tomanToIrr: (n: number) => number,
) {
  const type = policy.depositType ?? "none";
  if (type === "none") return 0;
  if (type === "fixed") return tomanToIrr(Math.max(0, Math.round(policy.depositAmount ?? 0)));
  const pct = Math.max(0, Math.min(100, policy.depositPercent ?? 0));
  return Math.floor((tomanToIrr(priceToman) * pct) / 100);
}
