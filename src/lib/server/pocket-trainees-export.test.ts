import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { exportPocketTrainees } from "./pocket-trainees-export.ts";
test("real table export is user-scoped, read-only, includes progress, debts and Jalali payments", async () => {
  const statements: string[] = [];
  const sql = {
    query: async <T>(query: string, params: unknown[]): Promise<T[]> => {
      statements.push(query);
      assert.deepEqual(params, ["verified-owner"]);
      assert.ok(query.trim().startsWith("select"));
      assert.ok(query.includes("user_id=$1"));
      return (
        query.includes("from studio_apprentices where")
          ? [
              {
                id: "a1",
                name: "هنرجو",
                phone: "09",
                kind: "regular",
                session_goal: 10,
                sessions_done: 4,
                debt_toman: 300000,
                created_at: "2026-11-06T00:00:00Z",
              },
            ]
          : [
              {
                id: "p1",
                apprentice_id: "a1",
                amount_toman: "200000",
                paid_on: "2026-11-06",
                note: "شهریه",
              },
            ]
      ) as T[];
    },
  };
  const result = await exportPocketTrainees(sql, "verified-owner");
  assert.equal(result.trainees[0].feeTotalToman, 500000);
  assert.equal(result.trainees[0].sessionsDone, 4);
  assert.equal(result.traineePayments[0].traineeId, result.trainees[0].id);
  assert.equal(result.traineePayments[0].paidOn, "1405-08-15");
  assert.equal(statements.length, 2);
  const code = readFileSync("src/lib/server/writes.ts", "utf8");
  const action = code.slice(
    code.indexOf("async function performStudioPocketExport"),
    code.indexOf("async function performStudioPocketImport"),
  );
  assert.ok(
    action.indexOf('actor.role !== "owner"') < action.indexOf("exportPocketTrainees(sql, userId)"),
  );
  assert.ok(action.includes("requireStudioStaff(userId)"));
});
