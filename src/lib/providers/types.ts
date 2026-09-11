/**
 * Contracts for swappable infrastructure. Implementations live next to the
 * feature that uses them. Do not add paid SDKs here until the feature ships.
 */
export type ProviderKind =
  | "map"
  | "email"
  | "sms"
  | "push"
  | "payment"
  | "storage"
  | "ai";

export type EmailMessage = { to: string; subject: string; text: string };

export type EmailProvider = {
  id: string;
  send(message: EmailMessage): Promise<boolean>;
};
