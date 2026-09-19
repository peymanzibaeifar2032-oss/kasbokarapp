import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { isIranMobile, normalizeIranPhone, parseToman } from "@/lib/format";
import { clientKey, allowRate } from "@/lib/server/rate-limit";

const inputSchema = z.object({
  fullName: z.string().trim().min(2, "نام و نام خانوادگی را کامل بنویسید.").max(80),
  phone: z.string().trim().max(40),
  scoreAmount: z.string().trim().max(40).optional(),
  repaymentMonths: z.coerce.number().int().min(1).max(120).optional().nullable(),
  branchCode: z.string().trim().min(1, "کد شعبه را وارد کنید.").max(20),
  province: z.string().trim().min(2, "استان را وارد کنید.").max(80),
  county: z.string().trim().min(2, "شهرستان را وارد کنید.").max(80),
  description: z.string().trim().max(1000).optional(),
  website: z.string().max(0).optional(),
});

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function sameOrigin(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}

async function submit(request: Request) {
  try {
    if (!sameOrigin(request)) return json({ error: "درخواست مجاز نیست." }, 403);
    if (!allowRate(`mehr-lead:${clientKey(request)}`, 5, 60 * 60 * 1000)) {
      return json({ error: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید." }, 429);
    }
    const data = inputSchema.parse(await request.json());
    if (data.website) return json({ ok: true });
    const phone = normalizeIranPhone(data.phone);
    if (!isIranMobile(phone)) return json({ error: "شماره موبایل ایرانی معتبر وارد کنید." }, 400);
    const scoreAmount = data.scoreAmount ? parseToman(data.scoreAmount) : 0;
    if (scoreAmount > 100_000_000_000) return json({ error: "مبلغ امتیاز معتبر نیست." }, 400);

    const sql = await getSql();
    const id = crypto.randomUUID();
    let trackingCode = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      trackingCode = String(100000 + Math.floor(Math.random() * 900000));
      try {
        await sql.query(
          `insert into mehr_loan_leads
             (id, tracking_code, full_name, phone, score_amount_toman, repayment_months,
              branch_code, province, county, description)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [id, trackingCode, data.fullName, phone, scoreAmount || null, data.repaymentMonths ?? null,
            data.branchCode, data.province, data.county, data.description || null],
        );
        return json({ ok: true, trackingCode, status: "reviewing" });
      } catch (error) {
        if (attempt === 4 || !/unique|duplicate/i.test(error instanceof Error ? error.message : "")) throw error;
      }
    }
    return json({ error: "ثبت درخواست انجام نشد." }, 500);
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message || "اطلاعات را کامل کنید."
      : error instanceof Error ? error.message : "ثبت درخواست انجام نشد.";
    return json({ error: message }, 400);
  }
}

export const Route = createFileRoute("/api/mehr-loan-leads")({
  server: { handlers: { POST: ({ request }) => submit(request) } },
});
