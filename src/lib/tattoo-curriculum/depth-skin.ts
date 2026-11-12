import type { TocPart } from "./index.ts";
import { DEPTH_SKIN_IMAGES } from "./depth-skin-images.generated.ts";
import { DEPTH_SKIN_TEXT } from "./depth-skin-text.ts";

export const DEPTH_SKIN_ID = "cur-depth-skin";
export const DEPTH_SKIN_TITLE = "عمق سوزن روی پوست واقعی";
const GROUP_ID = "cur-grp-c10";

type Card = { id: string; title: string; order: number; groupId: string | null };
type Catalog = {
  groups: { id: string; title: string; order: number; lessons: Card[] }[];
  lessons: Card[];
};

const imageOrder = ["cur-depth-img-1", "cur-depth-img-2", "cur-depth-img-3", "cur-depth-img-4", "cur-depth-img-6", "cur-depth-img-7"];

export function depthSkinImage(id: string) {
  return DEPTH_SKIN_IMAGES[id]?.data || "";
}

export function withDepthSkinToc(parts: TocPart[]): TocPart[] {
  return parts.map((part) => {
    if (part.id !== "p4") return part;
    return {
      ...part,
      chapters: part.chapters.map((chapter) => {
        if (chapter.id !== "c10" || chapter.lessons.some((lesson) => lesson.id === DEPTH_SKIN_ID)) return chapter;
        const lessons = [...chapter.lessons];
        const at = lessons.findIndex((lesson) => lesson.id === "cur-23");
        lessons.splice(at >= 0 ? at + 1 : lessons.length, 0, {
          id: DEPTH_SKIN_ID,
          number: (at >= 0 ? lessons[at].number : lessons.length) + 1,
          title: DEPTH_SKIN_TITLE,
          level: "متوسط",
          published: true,
          held: false,
        });
        return { ...chapter, lessons };
      }),
    };
  });
}

export function withDepthSkinCatalog<T extends Catalog>(catalog: T): T {
  if (catalog.lessons.some((lesson) => lesson.id === DEPTH_SKIN_ID) || catalog.groups.some((group) => group.lessons.some((lesson) => lesson.id === DEPTH_SKIN_ID))) {
    return catalog;
  }
  const card: Card = { id: DEPTH_SKIN_ID, title: DEPTH_SKIN_TITLE, order: 2, groupId: GROUP_ID };
  const lessons = [...catalog.lessons, card].sort((a, b) => a.order - b.order);
  const groups = catalog.groups.map((group) =>
    group.id === GROUP_ID ? { ...group, lessons: [...group.lessons, card].sort((a, b) => a.order - b.order) } : group,
  );
  if (!groups.some((group) => group.id === GROUP_ID)) {
    groups.push({ id: GROUP_ID, title: "فصل ۱۰ — دست روی پوست", order: 10, lessons: [card] });
    groups.sort((a, b) => a.order - b.order);
  }
  return { ...catalog, lessons, groups };
}

function imageCards(images: { id: string; path: string; caption: string }[]) {
  const source = images.length
    ? images
    : imageOrder.map((id, index) => ({
        id,
        path: `/api/tattoo/curriculum-image/${id}`,
        caption: DEPTH_SKIN_IMAGES[id]?.caption || "",
        order: index + 1,
      }));
  return source.map((image) => ({
    id: image.id,
    path: image.path,
    alt: image.caption || DEPTH_SKIN_TITLE,
    caption: image.caption,
    credit: "نمودار آموزشی همین درس",
    license: "استودیو",
    kind: "photo" as const,
  }));
}

export function depthSkinPlain(content = DEPTH_SKIN_TEXT, images: { id: string; path: string; caption: string }[] = []) {
  return {
    id: DEPTH_SKIN_ID,
    moduleId: "cur-mod-p4",
    title: DEPTH_SKIN_TITLE,
    content,
    order: 2,
    images: imageCards(images).map((image) => ({ id: image.id, path: image.path, caption: image.caption })),
  };
}

export function depthSkinClassView(content = DEPTH_SKIN_TEXT, images: { id: string; path: string; caption: string }[] = []) {
  const paragraphs = content.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  return {
    id: DEPTH_SKIN_ID,
    number: 24,
    title: DEPTH_SKIN_TITLE,
    level: "متوسط",
    partTitle: "بخش ۴ — اجرا",
    chapterTitle: "فصل ۱۰ — دست روی پوست",
    summary: paragraphs[2] || paragraphs[0] || "",
    objectives: [
      "عمق نفوذ سوزن را از عمق نهایی رنگ جدا کنی.",
      "جای درست رنگ را در درم پاپیلاری تا بالای رتیکولار بشناسی.",
      "نفوذ کم، مناسب و بیش از حد را از روی پوست تشخیص بدهی.",
    ],
    sections: [{ heading: "متن درس", paragraphs }],
    warnings: ["عدد میلی‌متر روی تصویرها تقریبی است و برای همهٔ ناحیه‌های بدن یکسان نیست."],
    keyPoints: [
      "لایهٔ هدف درم پاپیلاری تا بخش بالایی رتیکولار است.",
      "کم‌عمق بودن و ترمیم بعدی بهتر از آسیب دائمی است.",
      "بالا بردن ولتاژ جواب اول اشباع ضعیف نیست.",
    ],
    glossary: [
      { id: "dermis", fa: "درم", en: "Dermis", definition: "میان‌پوست؛ لایه‌ای که رنگ ماندگار تاتو در آن می‌نشیند." },
      { id: "blowout", fa: "بلوآوت", en: "Blowout", definition: "پخش جوهر در بافت زیر درم و تار شدن لبهٔ خط." },
    ],
    related: [
      { id: "cur-23", title: "نشست، کشش پوست، زاویه و عمق", number: 23, published: true },
      { id: "cur-24", title: "پوست خسته، بلوآوت و قضاوت حین کار", number: 25, published: true },
    ],
    readings: [],
    sources: [
      { id: "olszewska-2023", title: "Olszewska et al., Histology and Histopathology 2023", url: "https://doi.org/10.14670/HH-18-559", publisher: "Histology and Histopathology" },
      { id: "lea-1987", title: "Lea and Pawlowski, International Journal of Dermatology 1987", url: "https://doi.org/10.1111/j.1365-4362.1987.tb00590.x", publisher: "International Journal of Dermatology" },
    ],
    practice: {
      goal: "سه عمق را روی پوست مصنوعی از هم تشخیص بدهی.",
      material: "پوست مصنوعی، لاینر",
      steps: ["یک خط خیلی سطحی بزن و پاک کن.", "یک خط با نوک شناور و کشش درست بزن.", "فرق لبهٔ تیز و هالهٔ پخش را بنویس."],
      passCriteria: ["خط مناسب بعد از پاک کردن پیوسته بماند و هالهٔ آبی نداشته باشد."],
    },
    images: imageCards(images),
  };
}
