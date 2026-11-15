import { listVisibleLessonCards } from "@/lib/tattoo-learn/store.server";
import { tableOfContents } from "@/lib/tattoo-curriculum/index.ts";
import { mergePanelLessons } from "@/lib/tattoo-curriculum/panel-lessons.ts";
import { buildClassIndex } from "@/lib/tattoo-curriculum/class-index.ts";
import { withDepthSkinToc } from "@/lib/tattoo-curriculum/depth-skin.ts";

/** The one class index (book + studio/teach lessons), numbered, counted and with new lessons marked. */
export async function loadClassIndex() {
  // Lessons written in studio/teach live only in the class tables; list them with the book so they are not hidden.
  const visible = await listVisibleLessonCards().catch(() => []);
  return { visible, index: buildClassIndex(mergePanelLessons(withDepthSkinToc(tableOfContents()), visible), visible) };
}
