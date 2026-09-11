export type CircuitState = "closed" | "open" | "half-open";

export type Circuit = {
  failures: number;
  openUntil: number;
};

const DEFAULT: Circuit = { failures: 0, openUntil: 0 };

export function circuitState(c: Circuit, now = Date.now()): CircuitState {
  if (c.openUntil > now) return "open";
  if (c.failures > 0 && c.openUntil > 0 && now >= c.openUntil) return "half-open";
  return "closed";
}

export function recordSuccess(c: Circuit): Circuit {
  return { failures: 0, openUntil: 0 };
}

export function recordFailure(
  c: Circuit,
  now = Date.now(),
  threshold = 3,
  cooldownMs = 60_000,
): Circuit {
  const failures = c.failures + 1;
  if (failures >= threshold) return { failures, openUntil: now + cooldownMs };
  return { failures, openUntil: 0 };
}

export function isUsable(c: Circuit | undefined, now = Date.now()): boolean {
  return circuitState(c ?? DEFAULT, now) !== "open";
}
