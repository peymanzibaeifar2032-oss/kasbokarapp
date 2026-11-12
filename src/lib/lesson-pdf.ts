export type PdfBlock = { kind: "h1" | "h2" | "p" | "li"; text: string };

type JpegPage = { w: number; h: number; jpg: Uint8Array };

const encoder = new TextEncoder();

function bytesOf(value: string) {
  return encoder.encode(value);
}

function concat(parts: Uint8Array[]) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** One full-page JPEG per sheet. Offsets are measured in bytes so the file opens. */
export function pdfFromJpegs(pages: JpegPage[]) {
  if (!pages.length) throw new Error("صفحه‌ای ساخته نشد.");
  const chunks: Uint8Array[] = [];
  const offsets = [0];
  let length = 0;
  const push = (part: Uint8Array) => {
    chunks.push(part);
    length += part.length;
  };
  const text = (value: string) => push(bytesOf(value));
  const start = () => offsets.push(length);

  text("%PDF-1.4\n");
  const kids = pages.map((_, index) => `${3 + index * 3} 0 R`).join(" ");
  start();
  text("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  start();
  text(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);
  pages.forEach((page, index) => {
    const pageId = 3 + index * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const content = `q\n${page.w} 0 0 ${page.h} 0 0 cm\n/Im0 Do\nQ\n`;
    start();
    text(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.w} ${page.h}] /Contents ${contentId} 0 R /Resources << /XObject << /Im0 ${imageId} 0 R >> >> >>\nendobj\n`,
    );
    start();
    text(`${contentId} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);
    start();
    text(
      `${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.w} /Height ${page.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpg.length} >>\nstream\n`,
    );
    push(page.jpg);
    text("\nendstream\nendobj\n");
  });
  const xref = length;
  const total = 2 + pages.length * 3;
  let table = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= total; index += 1) table += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  text(table);
  text(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob([concat(chunks)], { type: "application/pdf" });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    const words = raw.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      if (ctx.measureText(word).width > maxWidth) {
        if (line) lines.push(line);
        let piece = "";
        for (const char of word) {
          const next = piece + char;
          if (ctx.measureText(next).width > maxWidth && piece) {
            lines.push(piece);
            piece = char;
          } else piece = next;
        }
        line = piece;
        continue;
      }
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function loadBitmap(path: string, token: string) {
  const response = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) return null;
  const blob = await response.blob();
  if (!blob.size) return null;
  return createImageBitmap(blob);
}

export async function buildLessonPdf(input: {
  title: string;
  blocks: PdfBlock[];
  images: { path: string; caption: string }[];
  token: string;
}) {
  const width = 1000;
  const height = 1414;
  const margin = 56;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.dir = "rtl";
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ساخت PDF روی این گوشی ممکن نیست.");
  await document.fonts?.load("700 40px Vazirmatn Variable");
  await document.fonts?.load("24px Vazirmatn Variable");
  const font = "Vazirmatn Variable, Vazirmatn, Tahoma, sans-serif";
  const pages: JpegPage[] = [];
  let y = margin;
  let open = false;

  const paint = () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    y = margin;
    open = true;
  };
  const snap = async () => {
    if (!open) return;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((file) => (file ? resolve(file) : reject(new Error("صفحه ذخیره نشد."))), "image/jpeg", 0.84);
    });
    pages.push({ w: width, h: height, jpg: new Uint8Array(await blob.arrayBuffer()) });
    open = false;
  };
  const ensure = async (need: number) => {
    if (!open) paint();
    if (y + need > height - margin) {
      await snap();
      paint();
    }
  };
  const write = async (text: string, size: number, bold: boolean, color: string, gap: number, indent = 0) => {
    ctx.font = `${bold ? "700 " : ""}${size}px ${font}`;
    ctx.fillStyle = color;
    const max = width - margin * 2 - indent;
    for (const line of wrap(ctx, text, max)) {
      await ensure(size + 16);
      if (line) ctx.fillText(line, width - margin - indent, y + size);
      y += line ? size + 14 : gap;
    }
    y += gap;
  };

  paint();
  await write(input.title, 40, true, "#1c3d52", 8);
  await write("استودیو پیمان زیبائی‌فر", 20, false, "#9a7340", 18);
  for (const block of input.blocks) {
    if (!block.text.trim()) continue;
    if (block.kind === "h1") await write(block.text, 32, true, "#1c3d52", 10);
    else if (block.kind === "h2") await write(block.text, 26, true, "#1c3d52", 8);
    else if (block.kind === "li") await write(`• ${block.text}`, 22, false, "#1c3d52", 4, 8);
    else await write(block.text, 22, false, "#24343c", 8);
  }
  for (const image of input.images) {
    const bitmap = await loadBitmap(image.path, input.token).catch(() => null);
    if (!bitmap) {
      await write(image.caption ? `تصویر باز نشد: ${image.caption}` : "یک تصویر باز نشد.", 20, false, "#8a3b32", 8);
      continue;
    }
    const maxW = width - margin * 2;
    const maxH = height - margin * 2 - 80;
    const scale = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
    const drawW = Math.round(bitmap.width * scale);
    const drawH = Math.round(bitmap.height * scale);
    await ensure(drawH + 72);
    const x = Math.round((width - drawW) / 2);
    ctx.drawImage(bitmap, x, y, drawW, drawH);
    bitmap.close?.();
    y += drawH + 12;
    if (image.caption) await write(image.caption, 18, false, "#5c6b73", 16);
    else y += 12;
  }
  await snap();
  const blob = pdfFromJpegs(pages);
  const filename = `${input.title.replace(/[\\/:*?"<>|]/g, " ").trim().slice(0, 60) || "درس"}.pdf`;
  return { blob, filename };
}

export function curriculumPdfBlocks(lesson: {
  partTitle?: string;
  chapterTitle?: string;
  level?: string;
  summary?: string;
  objectives?: string[];
  sections?: { heading: string; paragraphs?: string[]; bullets?: string[] }[];
  warnings?: string[];
  keyPoints?: string[];
  glossary?: { fa: string; en?: string; definition: string }[];
  sources?: { title: string; publisher?: string }[];
  practice?: { goal: string; material?: string; steps: string[]; passCriteria?: string[] };
}) {
  const blocks: PdfBlock[] = [];
  const place = [lesson.partTitle, lesson.chapterTitle, lesson.level ? `سطح ${lesson.level}` : ""].filter(Boolean).join(" · ");
  if (place) blocks.push({ kind: "p", text: place });
  if (lesson.summary) blocks.push({ kind: "p", text: lesson.summary });
  if (lesson.objectives?.length) {
    blocks.push({ kind: "h2", text: "در این درس یاد می‌گیری" });
    for (const item of lesson.objectives) blocks.push({ kind: "li", text: item });
  }
  for (const section of lesson.sections || []) {
    blocks.push({ kind: "h2", text: section.heading });
    for (const paragraph of section.paragraphs || []) blocks.push({ kind: "p", text: paragraph });
    for (const item of section.bullets || []) blocks.push({ kind: "li", text: item });
  }
  if (lesson.warnings?.length) {
    blocks.push({ kind: "h2", text: "هشدار" });
    for (const item of lesson.warnings) blocks.push({ kind: "li", text: item });
  }
  if (lesson.keyPoints?.length) {
    blocks.push({ kind: "h2", text: "نکته‌های کلیدی" });
    for (const item of lesson.keyPoints) blocks.push({ kind: "li", text: item });
  }
  if (lesson.glossary?.length) {
    blocks.push({ kind: "h2", text: "واژه‌نامه" });
    for (const term of lesson.glossary) blocks.push({ kind: "p", text: `${term.fa}${term.en ? ` (${term.en})` : ""}: ${term.definition}` });
  }
  if (lesson.practice?.steps.length) {
    blocks.push({ kind: "h2", text: "تمرین" });
    blocks.push({ kind: "p", text: lesson.practice.goal });
    if (lesson.practice.material) blocks.push({ kind: "p", text: `ابزار: ${lesson.practice.material}` });
    for (const step of lesson.practice.steps) blocks.push({ kind: "li", text: step });
    for (const item of lesson.practice.passCriteria || []) blocks.push({ kind: "li", text: `قبول: ${item}` });
  }
  if (lesson.sources?.length) {
    blocks.push({ kind: "h2", text: "منابع" });
    for (const source of lesson.sources) blocks.push({ kind: "li", text: [source.title, source.publisher].filter(Boolean).join(" — ") });
  }
  return blocks;
}

export function plainPdfBlocks(content: string) {
  const marker = "\n---تمرین---\n";
  const cut = content.indexOf(marker);
  const study = cut < 0 ? content : content.slice(0, cut);
  const practice = cut < 0 ? "" : content.slice(cut + marker.length);
  const blocks: PdfBlock[] = [];
  for (const paragraph of study.split(/\n{2,}/)) {
    const text = paragraph.trim();
    if (text) blocks.push({ kind: "p", text });
  }
  if (practice.trim()) {
    blocks.push({ kind: "h2", text: "تمرین" });
    for (const paragraph of practice.split(/\n{2,}/)) {
      const text = paragraph.trim();
      if (text) blocks.push({ kind: "p", text });
    }
  }
  return blocks;
}
