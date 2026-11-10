import { GLOSSARY } from "./glossary.ts";
import { SOURCES } from "./sources.ts";
import type { CurriculumLesson } from "./types.ts";

/** Plain text the class app and the lesson editor can both show. */
export function lessonPlainText(lesson: CurriculumLesson) {
  const lines: string[] = [
    "سطح",
    lesson.level,
    "",
    "خلاصه",
    lesson.summary,
    "",
    "هدف‌ها",
    ...lesson.objectives.map((item) => `- ${item}`),
  ];
  for (const section of lesson.sections) {
    lines.push("", section.heading);
    for (const paragraph of section.paragraphs ?? []) lines.push(paragraph, "");
    for (const bullet of section.bullets ?? []) lines.push(`- ${bullet}`);
  }
  lines.push("", "نکته‌های کلیدی", ...lesson.keyPoints.map((item) => `- ${item}`));
  if (lesson.warnings.length) lines.push("", "هشدار", ...lesson.warnings.map((item) => `- ${item}`));
  lines.push(
    "",
    "تمرین",
    `هدف: ${lesson.practice.goal}`,
    `وسایل: ${lesson.practice.material}`,
    ...lesson.practice.steps.map((step, index) => `${index + 1}. ${step}`),
    "قبول وقتی:",
    ...lesson.practice.passCriteria.map((item) => `- ${item}`),
  );
  const terms = lesson.glossary.map((id) => GLOSSARY.find((term) => term.id === id)).filter((term) => !!term);
  if (terms.length) {
    lines.push("", "واژه‌ها");
    for (const term of terms) lines.push(`- ${term.fa} (${term.en}): ${term.definition}`);
  }
  const sources = lesson.sources.map((id) => SOURCES.find((source) => source.id === id)).filter((source) => !!source);
  if (sources.length) {
    lines.push("", "منابع");
    for (const source of sources) lines.push(`- ${source.title}. ${source.publisher}`);
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
