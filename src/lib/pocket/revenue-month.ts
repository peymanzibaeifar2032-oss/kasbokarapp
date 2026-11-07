export function aggregateCashForMonth(
  rows: { day: string; kind: "income" | "expense"; amountToman: number }[],
  jy: number,
  jm: number,
) {
  const prefix = `${jy}-${String(jm).padStart(2, "0")}-`;
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    if (!row.day.startsWith(prefix)) continue;
    if (row.kind === "income") income += row.amountToman;
    else expense += row.amountToman;
  }
  return { income, expense };
}
