import { formatFaDateTime, instagramProfileUrl, normalizeInstagramHandle } from "./format.ts";
import { formatTattooToman, tattooBalance } from "./tattoo-flow.ts";
import type { TattooRequest } from "./types.ts";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function esc(value: string) {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function jobHtml(job: TattooRequest) {
  const when = job.proposedSlotStart || job.createdAt;
  const balance = tattooBalance(job.priceMinToman, job.paidToman);
  const insta = normalizeInstagramHandle(job.customerInstagram);
  const instaUrl = instagramProfileUrl(job.customerInstagram);
  const phones = [job.customerPhone, job.customerPhone2].filter((p) => p && p !== "09000000000");
  const images = [...(job.referenceImages ?? []), ...(job.bodyImages ?? [])].slice(0, 4);
  return `<article class="card">
    <h2>${esc(job.customerName)}</h2>
    <p class="meta">${esc(formatFaDateTime(when))} · ${esc(job.placement || "—")} · ${esc(job.sizeCm || "—")}</p>
    <p><b>طرح:</b> ${esc(job.style)}${job.idea ? ` — ${esc(job.idea)}` : ""}</p>
    <p><b>تماس:</b> ${esc(phones.join(" / ") || "—")}
      ${insta ? ` · اینستاگرام: ${instaUrl ? `<a href="${esc(instaUrl)}">@${esc(insta)}</a>` : `@${esc(insta)}`}` : ""}</p>
    <p><b>مبلغ:</b> کل ${esc(formatTattooToman(balance.total))} · واریزی ${esc(formatTattooToman(balance.paid))} · مانده ${esc(formatTattooToman(balance.remaining))}</p>
    ${
      images.length
        ? `<div class="thumbs">${images.map((src) => `<img src="${esc(src)}" alt="">`).join("")}</div>`
        : ""
    }
  </article>`;
}

export function studioJobsReportHtml(jobs: TattooRequest[], title: string) {
  const stamped = new Date().toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
  body{font-family:Tahoma,Vazirmatn,sans-serif;background:#fff;color:#111;margin:24px;line-height:1.7}
  h1{font-size:22px;margin:0 0 8px}
  .sub{color:#555;margin-bottom:20px}
  .card{border:1px solid #ddd;border-radius:16px;padding:16px;margin:0 0 16px;page-break-inside:avoid}
  h2{margin:0 0 4px;font-size:18px}
  .meta{color:#555;margin:0 0 8px}
  .thumbs{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  .thumbs img{width:96px;height:96px;object-fit:cover;border-radius:10px;border:1px solid #eee}
  @media print { body{margin:12px} a{color:#000;text-decoration:none} }
</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <p class="sub">پیمان زیبائی‌فر · ${esc(stamped)} · ${new Intl.NumberFormat("fa-IR").format(jobs.length)} مشتری</p>
  ${jobs.map(jobHtml).join("\n")}
</body>
</html>`;
}

export function downloadStudioJobsPdf(jobs: TattooRequest[], title: string) {
  if (!jobs.length) throw new Error("لیستی برای دانلود نیست.");
  const html = studioJobsReportHtml(jobs, title);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `list-moshtari-${stamp}.html`);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  window.setTimeout(() => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      /* Android WebView may block print; HTML file is already saved */
    }
    window.setTimeout(() => frame.remove(), 1500);
  }, 350);
}
