// Builds the Markdown book manuscript (docs/apprentice-book/) from the curriculum source. Run:
// node --experimental-strip-types scripts/build-curriculum-book.mts
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { CHAPTERS, GLOSSARY, LESSONS, PARTS, READINGS, SOURCES, lessonNumber } from "../src/lib/tattoo-curriculum/index.ts";
import { READING_TEXT } from "../src/lib/tattoo-curriculum/readings.generated.ts";

const out = "docs/apprentice-book";
rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/readings`, { recursive: true });
for (const [k, v] of Object.entries(READING_TEXT)) writeFileSync(`${out}/readings/${k}.md`, v);
const fa = (n: number) => n.toLocaleString("fa-IR");
const src = new Map(SOURCES.map((s) => [s.id, s]));
const gl = new Map(GLOSSARY.map((g) => [g.id, g]));
const file = (chapterId: string) => `${chapterId}.md`;

const toc: string[] = ["# درس‌نامهٔ کارآموزی تاتو", "", "استودیو پیمان زیبائی‌فر — از مبتدی تا پیشرفته", "",
  "> این دست‌نوشتهٔ کتاب از همان منبع درس‌های سایت ساخته می‌شود (src/lib/tattoo-curriculum). برای ویرایش، منبع را تغییر بده و دوباره بساز.", "", "## فهرست", ""];
for (const part of PARTS) {
  toc.push(`### ${part.title} (سطح ${part.level})`, "", part.description, "");
  for (const ch of CHAPTERS.filter((c) => c.part === part.id)) {
    toc.push(`- [${ch.title}](${file(ch.id)})`);
    for (const l of LESSONS.filter((x) => x.chapter === ch.id)) toc.push(`  - درس ${fa(lessonNumber(l.id))}: ${l.title}`);
  }
  toc.push("");
}
toc.push("## مطالعهٔ تکمیلی (فصل‌های ویراسته)", "", ...Object.keys(READING_TEXT).map((k) => `- [${READINGS[k]}](readings/${k}.md)`), "");
toc.push("- [واژه‌نامه](glossary.md)", "- [منابع](sources.md)", "- [اعتبار تصویرها](image-credits.md)", "");
writeFileSync(`${out}/README.md`, toc.join("\n"));

for (const ch of CHAPTERS) {
  const part = PARTS.find((p) => p.id === ch.part)!;
  const md: string[] = [`# ${ch.title}`, "", `*${part.title}*`, ""];
  for (const l of LESSONS.filter((x) => x.chapter === ch.id)) {
    md.push(`## درس ${fa(lessonNumber(l.id))}: ${l.title}`, "", `<!-- id: ${l.id} -->`, `**سطح:** ${l.level}`, "", l.summary, "", "**در این درس یاد می‌گیری:**", "");
    md.push(...l.objectives.map((o) => `- ${o}`), "");
    l.sections.forEach((s, i) => {
      md.push(`### ${s.heading}`, "");
      for (const p of s.paragraphs ?? []) md.push(p, "");
      if (s.bullets?.length) md.push(...s.bullets.map((b) => `- ${b}`), "");
      const img = l.images[i];
      if (img) md.push(`![${img.alt}](../tattoo-curriculum/images/${img.id}.webp)`, "", `*${img.caption}*${img.kind === "photo-needed" ? " — جای عکس واقعی استودیو" : ""}`, "");
    });
    for (const img of l.images.slice(l.sections.length)) md.push(`![${img.alt}](../tattoo-curriculum/images/${img.id}.webp)`, "", `*${img.caption}*${img.kind === "photo" ? ` — ${img.credit}` : ""}`, "");
    if (l.warnings.length) md.push("> **هشدار**", ">", ...l.warnings.map((w) => `> - ${w}`), "");
    md.push("**نکته‌های کلیدی:**", "", ...l.keyPoints.map((k) => `- ${k}`), "");
    md.push("### تمرین", "", `**هدف:** ${l.practice.goal}`, "", `**ابزار:** ${l.practice.material}`, "", ...l.practice.steps.map((s, i) => `${fa(i + 1)}. ${s}`), "",
      "**معیار قبولی:**", "", ...l.practice.passCriteria.map((c) => `- ${c}`), "");
    if (l.glossary.length) md.push("**واژه‌ها:** " + l.glossary.map((g) => `${gl.get(g)!.fa} (${gl.get(g)!.en})`).join("، "), "");
    if (l.related.length) md.push("**مرتبط:** " + l.related.map((r) => `درس ${fa(lessonNumber(r))}`).join("، "), "");
    md.push("**منابع:**", "", ...l.sources.map((s) => { const x = src.get(s)!; return `- ${x.publisher}، «${x.title}»${x.url ? ` — <${x.url}>` : ""}`; }), "", "---", "");
  }
  writeFileSync(`${out}/${file(ch.id)}`, md.join("\n"));
}
writeFileSync(`${out}/glossary.md`, ["# واژه‌نامه", "", "| واژه | انگلیسی | تعریف |", "|---|---|---|", ...GLOSSARY.map((g) => `| ${g.fa} | ${g.en} | ${g.definition} |`), ""].join("\n"));
writeFileSync(`${out}/sources.md`, ["# منابع", "", ...SOURCES.map((s) => `- **${s.publisher}** — ${s.title}${s.url ? ` — <${s.url}>` : ""}`), ""].join("\n"));
writeFileSync(`${out}/image-credits.md`, ["# اعتبار تصویرها", "", "| اسلات | درس | نوع | اعتبار | مجوز |", "|---|---|---|---|---|",
  ...LESSONS.flatMap((l) => l.images.map((i) => `| ${i.id} | ${l.id} | ${i.kind === "svg" ? "نمودار" : i.kind === "photo" ? "عکس" : "جای عکس استودیو"} | ${i.credit}${i.sourceUrl ? ` ([منبع](${i.sourceUrl}))` : ""} | ${i.license} |`)), ""].join("\n"));
console.log("book written:", CHAPTERS.length, "chapters,", LESSONS.length, "lessons");
