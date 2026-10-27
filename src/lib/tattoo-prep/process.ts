export type PaperId = "a4" | "a3" | "letter";
export type InkColor = "red" | "black" | "green" | "blue";

const INK_RGB: Record<InkColor, [number, number, number]> = {
  red: [176, 36, 42],
  black: [12, 12, 12],
  green: [18, 120, 58],
  blue: [24, 72, 190],
};

export const PAPERS: Record<PaperId, { label: string; w: number; h: number }> = {
  a4: { label: "A4", w: 210, h: 297 },
  a3: { label: "A3", w: 297, h: 420 },
  letter: { label: "Letter", w: 215.9, h: 279.4 },
};

export function pageSize(paper: PaperId, portrait = true) {
  const sheet = PAPERS[paper];
  return portrait ? { w: sheet.w, h: sheet.h, label: sheet.label } : { w: sheet.h, h: sheet.w, label: sheet.label };
}

export function sheetPlan(widthCm: number, heightCm: number, paper: PaperId, portrait = true) {
  const page = pageSize(paper, portrait);
  const margin = 10;
  const usableW = Math.max(20, page.w - margin * 2);
  const usableH = Math.max(20, page.h - margin * 2);
  const widthMm = widthCm * 10;
  const heightMm = heightCm * 10;
  const cols = Math.max(1, Math.ceil(widthMm / usableW));
  const rows = Math.max(1, Math.ceil(heightMm / usableH));
  return {
    label: page.label,
    pageW: page.w,
    pageH: page.h,
    margin,
    usableW,
    usableH,
    widthMm,
    heightMm,
    cols,
    rows,
    pages: cols * rows,
  };
}

export function tilePlan(designW: number, designH: number, paper: PaperId, marginMm = 12) {
  const sheet = PAPERS[paper];
  const usableW = Math.max(20, sheet.w - marginMm * 2);
  const usableH = Math.max(20, sheet.h - marginMm * 2);
  const cols = Math.max(1, Math.ceil(designW / usableW));
  const rows = Math.max(1, Math.ceil(designH / usableH));
  return { cols, rows, pages: cols * rows, usableW, usableH, sheet };
}

export function escapeText(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("عکس باز نشد."));
    image.src = src;
  });
}

function canvasFrom(image: HTMLImageElement, max = 1600) {
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("پردازش عکس روی این دستگاه ممکن نیست.");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

function paint(src: string, max = 1600) {
  return loadImage(src).then((image) => canvasFrom(image, max));
}

export async function fileToDataUrl(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("فقط فایل تصویری بگذار.");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const { canvas, ctx } = canvasFrom(image, 1600);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function extractTattoo(src: string, transparent: boolean) {
  const { canvas, ctx } = await paint(src);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = frame.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const skin = r > 75 && g > 35 && b > 15 && r > g && r + 8 >= b && r - g > 10 && y > 55 && y < 235;
    const paper = y > 228 && max - min < 28;
    if (skin || paper) {
      data[i] = transparent ? 0 : 255;
      data[i + 1] = transparent ? 0 : 255;
      data[i + 2] = transparent ? 0 : 255;
      data[i + 3] = transparent ? 0 : 255;
    } else {
      const ink = Math.max(0, Math.min(255, (y - 30) * 1.35));
      const v = ink < 210 ? Math.round(ink * 0.45) : 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(frame, 0, 0);
  return canvas.toDataURL("image/png");
}

function grayOf(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const i = (y * width + x) * 4;
  return 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
}

export async function makeStencil(
  src: string,
  mode: "outline" | "stipple" | "hatch" | "sketch",
  threshold: number,
  thickness: number,
  mirror: boolean,
) {
  const { canvas, ctx } = await paint(src, 1400);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const out = ctx.createImageData(canvas.width, canvas.height);
  const w = canvas.width;
  const h = canvas.height;
  const ink = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    out.data[i] = 0;
    out.data[i + 1] = 0;
    out.data[i + 2] = 0;
    out.data[i + 3] = 255;
  };
  const paper = () => {
    for (let i = 0; i < out.data.length; i += 4) {
      out.data[i] = 255;
      out.data[i + 1] = 255;
      out.data[i + 2] = 255;
      out.data[i + 3] = 255;
    }
  };
  paper();
  const blot = (x: number, y: number, radius: number) => {
    const r = Math.max(1, radius);
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (dx * dx + dy * dy > r * r) continue;
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        ink(px, py);
      }
    }
  };
  const spot = (x: number, y: number) => blot(x, y, thickness);
  const drawOutline = () => {
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const gx =
          -grayOf(frame.data, w, x - 1, y - 1) +
          grayOf(frame.data, w, x + 1, y - 1) -
          2 * grayOf(frame.data, w, x - 1, y) +
          2 * grayOf(frame.data, w, x + 1, y) -
          grayOf(frame.data, w, x - 1, y + 1) +
          grayOf(frame.data, w, x + 1, y + 1);
        const gy =
          -grayOf(frame.data, w, x - 1, y - 1) -
          2 * grayOf(frame.data, w, x, y - 1) -
          grayOf(frame.data, w, x + 1, y - 1) +
          grayOf(frame.data, w, x - 1, y + 1) +
          2 * grayOf(frame.data, w, x, y + 1) +
          grayOf(frame.data, w, x + 1, y + 1);
        const mag = Math.hypot(gx, gy);
        if (mag > threshold * 1.4) spot(x, y);
      }
    }
  };
  const drawStipple = (dot: number) => {
    const step = Math.max(5, 14 - thickness);
    for (let y = step; y < h; y += step) {
      for (let x = step; x < w; x += step) {
        const tone = grayOf(frame.data, w, x, y);
        if (tone < threshold + 40) blot(x, y, dot);
      }
    }
  };
  if (mode === "outline") {
    drawOutline();
  } else if (mode === "stipple") {
    drawStipple(Math.max(1, thickness));
  } else if (mode === "sketch") {
    drawOutline();
    drawStipple(1);
  } else {
    const gap = Math.max(4, 16 - thickness * 2);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if ((x + y) % gap > 1) continue;
        if (grayOf(frame.data, w, x, y) < threshold + 30) ink(x, y);
      }
    }
  }
  ctx.putImageData(out, 0, 0);
  if (!mirror) return canvas.toDataURL("image/png");
  const flipped = document.createElement("canvas");
  flipped.width = canvas.width;
  flipped.height = canvas.height;
  const fx = flipped.getContext("2d");
  if (!fx) return canvas.toDataURL("image/png");
  fx.translate(flipped.width, 0);
  fx.scale(-1, 1);
  fx.drawImage(canvas, 0, 0);
  return flipped.toDataURL("image/png");
}

export async function recolorStencil(src: string, ink: InkColor, mirror: boolean) {
  const { canvas, ctx } = await paint(src, 1400);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const tone = INK_RGB[ink];
  const data = frame.data;
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
    const darkness = 1 - y / 255;
    if (darkness < 0.06) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
      continue;
    }
    const weight = Math.min(1, (darkness - 0.06) / 0.7);
    data[i] = Math.round(255 * (1 - weight) + tone[0] * weight);
    data[i + 1] = Math.round(255 * (1 - weight) + tone[1] * weight);
    data[i + 2] = Math.round(255 * (1 - weight) + tone[2] * weight);
    data[i + 3] = 255;
  }
  ctx.putImageData(frame, 0, 0);
  if (!mirror) return canvas.toDataURL("image/png");
  const flipped = document.createElement("canvas");
  flipped.width = canvas.width;
  flipped.height = canvas.height;
  const fx = flipped.getContext("2d");
  if (!fx) return canvas.toDataURL("image/png");
  fx.translate(flipped.width, 0);
  fx.scale(-1, 1);
  fx.drawImage(canvas, 0, 0);
  return flipped.toDataURL("image/png");
}

export async function enhancePhoto(
  src: string,
  opts: { scale: number; bright: number; contrast: number; sharpen: number; denoise: number },
) {
  const image = await loadImage(src);
  const scale = Math.min(2, Math.max(1, opts.scale));
  const base = canvasFrom(image, 1200);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(base.canvas.width * scale);
  canvas.height = Math.round(base.canvas.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("پردازش عکس روی این دستگاه ممکن نیست.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (opts.denoise > 0) ctx.filter = `blur(${Math.min(2, opts.denoise)}px)`;
  ctx.drawImage(base.canvas, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const c = Math.max(0.2, opts.contrast);
  const b = opts.bright;
  for (let i = 0; i < frame.data.length; i += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const value = ((frame.data[i + channel] ?? 0) - 128) * c + 128 + b;
      frame.data[i + channel] = Math.max(0, Math.min(255, value));
    }
  }
  if (opts.sharpen > 0) {
    const copy = new Uint8ClampedArray(frame.data);
    const amount = Math.min(1.2, opts.sharpen);
    const w = canvas.width;
    for (let y = 1; y < canvas.height - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const i = (y * w + x) * 4;
        for (let channel = 0; channel < 3; channel += 1) {
          const center = copy[i + channel] ?? 0;
          const around =
            (copy[i - 4 + channel] ?? 0) +
            (copy[i + 4 + channel] ?? 0) +
            (copy[i - w * 4 + channel] ?? 0) +
            (copy[i + w * 4 + channel] ?? 0);
          const sharp = center * (1 + amount) - (around / 4) * amount;
          frame.data[i + channel] = Math.max(0, Math.min(255, sharp));
        }
      }
    }
  }
  ctx.putImageData(frame, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.9);
}

const BACKGROUNDS: Record<string, [string, string]> = {
  studio: ["#1a1a1d", "#3a3328"],
  dark: ["#050505", "#161616"],
  cream: ["#f4efe6", "#d9c7a4"],
  led: ["#101820", "#1d4ed8"],
};

export async function stagePhoto(src: string, background: string, frame: "post" | "story", watermark: string) {
  const image = await loadImage(src);
  const width = frame === "post" ? 1080 : 1080;
  const height = frame === "post" ? 1080 : 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ساخت عکس ممکن نیست.");
  const [from, to] = BACKGROUNDS[background] || BACKGROUNDS.studio;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const pad = frame === "post" ? 80 : 120;
  const boxW = width - pad * 2;
  const boxH = height - pad * 2;
  const fit = Math.min(boxW / image.width, boxH / image.height);
  const dw = image.width * fit;
  const dh = image.height * fit;
  ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
  const mark = watermark.trim().slice(0, 40);
  if (mark) {
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillRect(0, height - 92, width, 92);
    ctx.fillStyle = "#f4efe6";
    ctx.font = "600 36px Vazirmatn Variable, Tahoma, sans-serif";
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillText(mark, width - 36, height - 36);
  }
  return canvas.toDataURL("image/jpeg", 0.9);
}

export async function printSheets(src: string, widthCm: number, heightCm: number, paper: PaperId, portrait = true) {
  const plan = sheetPlan(widthCm, heightCm, paper, portrait);
  const image = await loadImage(src);
  const pages: string[] = [];
  const fits = plan.pages === 1;
  for (let row = 0; row < plan.rows; row += 1) {
    for (let col = 0; col < plan.cols; col += 1) {
      const tileW = fits ? plan.widthMm : plan.widthMm / plan.cols;
      const tileH = fits ? plan.heightMm : plan.heightMm / plan.rows;
      const dx = fits ? (plan.pageW - plan.widthMm) / 2 : plan.margin;
      const dy = fits ? (plan.pageH - plan.heightMm) / 2 : plan.margin;
      const label = plan.pages > 1 ? `${col + 1}/${plan.cols} · ${row + 1}/${plan.rows}` : "";
      pages.push(
        drawPrintPage(image, plan.pageW, plan.pageH, dx, dy, tileW, tileH, (col / plan.cols) * image.width, (row / plan.rows) * image.height, image.width / plan.cols, image.height / plan.rows, label),
      );
    }
  }
  return { pages, plan };
}

function drawPrintPage(
  image: HTMLImageElement,
  pageWmm: number,
  pageHmm: number,
  dxMm: number,
  dyMm: number,
  dwMm: number,
  dhMm: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  label: string,
) {
  const dpi = 180;
  const px = (mm: number) => (mm / 25.4) * dpi;
  let width = Math.round(px(pageWmm));
  let height = Math.round(px(pageHmm));
  const fit = Math.min(1, 2800 / Math.max(width, height));
  width = Math.max(1, Math.round(width * fit));
  height = Math.max(1, Math.round(height * fit));
  const scale = width / pageWmm;
  const page = document.createElement("canvas");
  page.width = width;
  page.height = height;
  const ctx = page.getContext("2d");
  if (!ctx) throw new Error("آماده‌سازی چاپ ممکن نیست.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, sw, sh, dxMm * scale, dyMm * scale, dwMm * scale, dhMm * scale);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(1, scale * 0.25);
  ctx.strokeRect(dxMm * scale, dyMm * scale, dwMm * scale, dhMm * scale);
  if (label) {
    ctx.fillStyle = "#111111";
    ctx.font = `${Math.max(14, Math.round(scale * 3.2))}px sans-serif`;
    ctx.fillText(label, 12, height - 14);
  }
  return page.toDataURL("image/png");
}

export async function shrinkDataUrl(src: string, max = 960) {
  const { canvas } = await paint(src, max);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}
