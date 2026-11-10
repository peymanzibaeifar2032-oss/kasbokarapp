/**
 * Tattoo apprentice curriculum (v2). One source of truth for the site class,
 * the apprentice tutor, and the book manuscript. Persian, RTL.
 */
export type Level = "مبتدی" | "متوسط" | "پیشرفته";

export type CurriculumSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type ImageSlot = {
  /** Stable slot id, e.g. "cur-03-a". */
  id: string;
  /** svg: built in docs/tattoo-curriculum/diagrams; photo-needed: the studio must supply its own photo. */
  kind: "svg" | "photo-needed" | "photo";
  /** Diagram file name (without extension) for kind "svg". */
  diagram?: string;
  /** What the picture must show, precise enough for an illustrator or photographer. */
  brief: string;
  alt: string;
  caption: string;
  credit: string;
  license: string;
  /** Original page of a licensed (CC) photo. */
  sourceUrl?: string;
};

export type Practice = {
  goal: string;
  steps: string[];
  passCriteria: string[];
  /** Material: synthetic skin, paper, fruit skin, etc. */
  material: string;
};

export type CurriculumLesson = {
  id: string;
  part: string;
  chapter: string;
  order: number;
  level: Level;
  title: string;
  summary: string;
  objectives: string[];
  sections: CurriculumSection[];
  keyPoints: string[];
  warnings: string[];
  practice: Practice;
  glossary: string[];
  related: string[];
  sources: string[];
  images: ImageSlot[];
  /** Old tattoo-school lesson ids (migrations 0060-0068) whose content this lesson absorbs. */
  replaces: string[];
  /** Words the apprentice tutor should match on. */
  tags: string[];
};

export type Chapter = { id: string; part: string; order: number; title: string };
export type Part = { id: string; order: number; title: string; level: Level; description: string };

export type Source = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  /** "official" = health/regulatory body, "medical" = peer-reviewed/medical reference, "industry" = trade reference, "artist" = reference page about a renowned artist (no copyrighted artwork is embedded), "studio" = this studio's own method. */
  kind: "official" | "medical" | "industry" | "artist" | "studio";
};

export type GlossaryTerm = { id: string; fa: string; en: string; definition: string };
