import { writeFileSync } from "node:fs";
import { CHAPTERS, LESSONS, PARTS } from "../src/lib/tattoo-curriculum/index.ts";
import { lessonPlainText } from "../src/lib/tattoo-curriculum/plain.ts";
import { CURRICULUM_IMAGES } from "../src/lib/tattoo-curriculum/images.generated.ts";

function q(value: string) {
  const tag = `q${Math.random().toString(36).slice(2, 10)}`;
  if (value.includes(`$${tag}$`)) throw new Error("tag collision");
  return `$${tag}$${value}$${tag}$`;
}

const lines: string[] = [
  "-- Put the v2 curriculum into the class tables the app and the teach panel already use.",
  "update tattoo_modules set is_active = false, updated_at = now() where id not like 'cur-mod-%';",
  "",
];

for (const part of PARTS) {
  lines.push(
    `insert into tattoo_modules (id, title, description, "order", is_active, updated_at)
values ('cur-mod-${part.id}', ${q(part.title)}, ${q(part.description)}, ${part.order}, true, now())
on conflict (id) do update set title = excluded.title, description = excluded.description, "order" = excluded."order", is_active = true, updated_at = now();`,
  );
}

for (const chapter of CHAPTERS) {
  lines.push(
    `insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-${chapter.id}', 'cur-mod-${chapter.part}', ${q(chapter.title)}, ${chapter.order})
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";`,
  );
}

for (const lesson of LESSONS) {
  const body = lessonPlainText(lesson);
  lines.push(
    `insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('${lesson.id}', 'cur-mod-${lesson.part}', ${q(lesson.title)}, ${q(body)}, ${lesson.order}, true, 'cur-grp-${lesson.chapter}', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();`,
  );
  lesson.images.forEach((image, index) => {
    if (!CURRICULUM_IMAGES[image.id]) return;
    const caption = image.caption || image.alt;
    lines.push(
      `insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('${image.id}', '${lesson.id}', '/api/tattoo/curriculum-image/${image.id}', 'curriculum', ${q(caption)}, ${index + 1})
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";`,
    );
  });
}

writeFileSync(new URL("../migrations/0069_curriculum_into_class.sql", import.meta.url), lines.join("\n") + "\n");
console.log("lessons", LESSONS.length, "bytes", lines.join("\n").length);
