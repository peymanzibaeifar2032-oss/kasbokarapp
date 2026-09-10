export function logError(src: string, err: unknown, extra?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(
    JSON.stringify({
      level: "error",
      src,
      message,
      t: new Date().toISOString(),
      ...extra,
    }),
  );
}
