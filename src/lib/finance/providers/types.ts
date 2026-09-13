export type ProviderPayment = {
  provider: string;
  providerPaymentId: string;
  amountIrr: number;
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  rawSafe?: Record<string, string | number | boolean | null>;
};

export interface PaymentProvider {
  name: string;
  isEnabled(): boolean;
  createPayment(input: {
    amountIrr: number;
    orderId: string;
    callbackUrl: string;
    description: string;
  }): Promise<{ redirectUrl: string; providerPaymentId: string }>;
  verifyPayment(input: { providerPaymentId: string; amountIrr: number }): Promise<ProviderPayment>;
  getPaymentStatus(providerPaymentId: string): Promise<ProviderPayment>;
  refundPayment(input: { providerPaymentId: string; amountIrr: number }): Promise<ProviderPayment>;
}

export interface SettlementProvider {
  name: string;
  isEnabled(): boolean;
  createSettlement(input: {
    amountIrr: number;
    iban: string;
    trackId: string;
    notifyUrl: string;
    description: string;
  }): Promise<{ providerSettlementId: string; status: string }>;
  getSettlementStatus(providerSettlementId: string): Promise<{ status: string; failureReason?: string }>;
  cancelSettlementIfSupported(providerSettlementId: string): Promise<{ cancelled: boolean }>;
  getProviderBalance(): Promise<{ availableIrr: number }>;
}

export class ProviderDisabledError extends Error {
  constructor(provider = "payment") {
    super(`درگاه ${provider} هنوز پیکربندی نشده است.`);
    this.name = "ProviderDisabledError";
  }
}
