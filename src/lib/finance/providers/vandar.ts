import { env } from "../../env.server.ts";
import { irrToToman } from "../money.ts";
import { ProviderDisabledError, type PaymentProvider, type ProviderPayment, type SettlementProvider } from "./types.ts";

function creds() {
  return {
    apiKey: env("VANDAR_API_KEY"),
    business: env("VANDAR_BUSINESS"),
    settlementToken: env("VANDAR_SETTLEMENT_TOKEN"),
    webhookSecret: env("VANDAR_WEBHOOK_SECRET"),
  };
}

export function vandarStatus() {
  const c = creds();
  const paymentReady = Boolean(c.apiKey && c.business);
  const settlementReady = Boolean(c.settlementToken && c.business);
  return {
    provider: "vandar" as const,
    paymentReady,
    settlementReady,
    mode: paymentReady ? "live" : "configured_but_disabled",
  };
}

async function postJson(url: string, body: Record<string, unknown>, token?: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}

export const vandarPayments: PaymentProvider = {
  name: "vandar",
  isEnabled() {
    return vandarStatus().paymentReady;
  },
  async createPayment(input) {
    const c = creds();
    if (!c.apiKey) throw new ProviderDisabledError("وندار");
    const { ok, data } = await postJson("https://ipg.vandar.io/api/v3/send", {
      api_key: c.apiKey,
      amount: input.amountIrr,
      callback_url: input.callbackUrl,
      factorNumber: input.orderId,
      description: input.description,
    });
    const token = typeof data.token === "string" ? data.token : "";
    if (!ok || !token) throw new Error("ساخت پرداخت وندار ناموفق بود.");
    return { redirectUrl: `https://ipg.vandar.io/v3/${token}`, providerPaymentId: token };
  },
  async verifyPayment(input) {
    const c = creds();
    if (!c.apiKey) throw new ProviderDisabledError("وندار");
    const { ok, data } = await postJson("https://ipg.vandar.io/api/v3/verify", {
      api_key: c.apiKey,
      token: input.providerPaymentId,
    });
    const status = Number(data.status) === 1 && ok ? "paid" : "failed";
    return {
      provider: "vandar",
      providerPaymentId: input.providerPaymentId,
      amountIrr: input.amountIrr,
      status,
      rawSafe: { status: Number(data.status) || 0, transId: String(data.transId ?? "") },
    };
  },
  async getPaymentStatus(id) {
    return this.verifyPayment({ providerPaymentId: id, amountIrr: 0 });
  },
  async refundPayment() {
    throw new ProviderDisabledError("وندار استرداد");
  },
};

export const vandarSettlements: SettlementProvider = {
  name: "vandar",
  isEnabled() {
    return vandarStatus().settlementReady;
  },
  async createSettlement(input) {
    const c = creds();
    if (!c.settlementToken || !c.business) throw new ProviderDisabledError("وندار تسویه");
    const { ok, data } = await postJson(
      `https://api.vandar.io/v3/business/${c.business}/settlement/store`,
      {
        amount: irrToToman(input.amountIrr),
        iban: input.iban,
        track_id: input.trackId,
        notify_url: input.notifyUrl,
        description: input.description,
        is_instant: false,
      },
      c.settlementToken,
    );
    if (!ok) throw new Error("ثبت تسویه وندار ناموفق بود.");
    const settlement = Array.isArray((data.data as { settlement?: { id?: string }[] } | undefined)?.settlement)
      ? (data.data as { settlement: { id?: string }[] }).settlement[0]
      : undefined;
    return { providerSettlementId: settlement?.id || input.trackId, status: "submitted" };
  },
  async getSettlementStatus(id) {
    const c = creds();
    if (!c.settlementToken || !c.business) throw new ProviderDisabledError("وندار تسویه");
    const res = await fetch(`https://api.vandar.io/v4/business/${c.business}/settlement/${id}`, {
      headers: { Authorization: `Bearer ${c.settlementToken}`, Accept: "application/json" },
    });
    const data = (await res.json().catch(() => ({}))) as { status?: string };
    return { status: String(data.status || "processing") };
  },
  async cancelSettlementIfSupported(id) {
    const c = creds();
    if (!c.settlementToken || !c.business) throw new ProviderDisabledError("وندار تسویه");
    const res = await fetch(`https://api.vandar.io/v4/business/${c.business}/settlement/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${c.settlementToken}` },
    });
    return { cancelled: res.ok };
  },
  async getProviderBalance() {
    throw new ProviderDisabledError("وندار موجودی");
  },
};
