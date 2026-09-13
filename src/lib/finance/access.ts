export function canSeeBusinessFinance(opts: { actorId: string; isAdmin: boolean; ownerId: string }) {
  return opts.isAdmin || opts.actorId === opts.ownerId;
}

export function canSeeCustomerPayment(opts: { actorId: string; isAdmin: boolean; customerId: string }) {
  return opts.isAdmin || opts.actorId === opts.customerId;
}

export function maskIban(iban: string) {
  const compact = iban.replace(/\s/g, "").toUpperCase();
  const last = compact.slice(-4);
  return `IR••••••${last}`;
}

export function rejectClientAmount(serverIrr: number, clientIrr: number | undefined) {
  if (clientIrr != null && clientIrr !== serverIrr) {
    throw new Error("مبلغ پرداخت از سمت کاربر پذیرفته نمی‌شود.");
  }
  return serverIrr;
}

export function callbackIsNotProof() {
  throw new Error("callback مرورگر اثبات پرداخت نیست.");
}
