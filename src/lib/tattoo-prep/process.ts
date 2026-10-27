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

function meanBox(src: Float32Array, w: number, h: number, radius: number) {
  const r = Math.max(1, radius | 0);
  const iw = w + 1;
  const integral = new Float32Array(iw * (h + 1));
  for (let y = 1; y <= h; y += 1) {
    let row = 0;
    const srcRow = (y - 1) * w;
    const intRow = y * iw;
    const prev = (y - 1) * iw;
    for (let x = 1; x <= w; x += 1) {
      row += src[srcRow + x - 1] ?? 0;
      integral[intRow + x] = (integral[prev + x] ?? 0) + row;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x += 1) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);
      const sum =
        (integral[(y1 + 1) * iw + (x1 + 1)] ?? 0) -
        (integral[y0 * iw + (x1 + 1)] ?? 0) -
        (integral[(y1 + 1) * iw + x0] ?? 0) +
        (integral[y0 * iw + x0] ?? 0);
      out[y * w + x] = sum / ((x1 - x0 + 1) * (y1 - y0 + 1));
    }
  }
  return out;
}

function dotHash(x: number, y: number, salt: number) {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(salt, 1442695041)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return (n ^ (n >>> 16)) >>> 0;
}

function looksLikeSkin(r: number, g: number, b: number) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return y > 45 && y < 245 && cb > 77 && cb < 140 && cr > 130 && cr < 185 && r > 55 && r >= g - 8;
}

async function renderSketch(
  src: string,
  mode: "outline" | "stipple" | "hatch" | "sketch",
  variation: number,
  transparent: boolean,
  mirror: boolean,
  edgeBase: number,
  thickness: number,
) {
  await new Promise((resolve) => setTimeout(resolve, 16));
  const { canvas, ctx } = await paint(src, 1000);
  const w = canvas.width;
  const h = canvas.height;
  const frame = ctx.getImageData(0, 0, w, h);
  const pixels = frame.data;
  const count = w * h;
  const gray = new Float32Array(count);
  const chroma = new Uint8Array(count);
  const skin = new Uint8Array(count);
  for (let p = 0, i = 0; p < count; p += 1, i += 4) {
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;
    gray[p] = 0.299 * r + 0.587 * g + 0.114 * b;
    chroma[p] = Math.max(r, g, b) - Math.min(r, g, b);
    skin[p] = looksLikeSkin(r, g, b) ? 1 : 0;
  }
  const local = meanBox(gray, w, h, Math.max(14, Math.round(Math.min(w, h) * 0.08)));
  const dark = new Float32Array(count);
  for (let p = 0; p < count; p += 1) {
    const y = gray[p] ?? 0;
    const around = local[p] ?? y;
    const delta = around - y;
    const body = skin[p] === 1;
    const colorInk = (chroma[p] ?? 0) > 42 && !body && y < 210;
    const veryDark = y < 88;
    const greyInk = !body && y < 150 && delta > 28;
    const skinInk = body && y < 118 && delta > 36;
    if (!veryDark && !greyInk && !skinInk && !colorInk) continue;
    dark[p] = Math.max(0, Math.min(255, (veryDark ? 230 - y : 190 - y) + (colorInk ? 70 : 0)));
  }
  const soft = meanBox(dark, w, h, 1);
  const edge = new Uint8Array(count);
  const cut = edgeBase + variation * 8;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const p = y * w + x;
      const gx =
        -(soft[p - w - 1] ?? 0) +
        (soft[p - w + 1] ?? 0) -
        2 * (soft[p - 1] ?? 0) +
        2 * (soft[p + 1] ?? 0) -
        (soft[p + w - 1] ?? 0) +
        (soft[p + w + 1] ?? 0);
      const gy =
        -(soft[p - w - 1] ?? 0) -
        2 * (soft[p - w] ?? 0) -
        (soft[p - w + 1] ?? 0) +
        (soft[p + w - 1] ?? 0) +
        2 * (soft[p + w] ?? 0) +
        (soft[p + w + 1] ?? 0);
      if (Math.hypot(gx, gy) > cut) edge[p] = 1;
    }
  }
  const thick = new Uint8Array(count);
  const rad = Math.max(1, thickness + (variation === 1 ? 1 : 0));
  const rad2 = rad * rad;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!edge[y * w + x]) continue;
      for (let dy = -rad; dy <= rad; dy += 1) {
        const py = y + dy;
        if (py < 0 || py >= h) continue;
        for (let dx = -rad; dx <= rad; dx += 1) {
          if (dx * dx + dy * dy > rad2) continue;
          const px = x + dx;
          if (px < 0 || px >= w) continue;
          thick[py * w + px] = 1;
        }
      }
    }
  }
  const out = ctx.createImageData(w, h);
  const dest = out.data;
  for (let i = 0; i < dest.length; i += 4) {
    dest[i] = transparent ? 0 : 255;
    dest[i + 1] = transparent ? 0 : 255;
    dest[i + 2] = transparent ? 0 : 255;
    dest[i + 3] = transparent ? 0 : 255;
  }
  const inkAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    dest[i] = 0;
    dest[i + 1] = 0;
    dest[i + 2] = 0;
    dest[i + 3] = 255;
  };
  if (mode !== "stipple") {
    for (let p = 0; p < count; p += 1) {
      if (!thick[p]) continue;
      const i = p * 4;
      dest[i] = 0;
      dest[i + 1] = 0;
      dest[i + 2] = 0;
      dest[i + 3] = 255;
    }
  }
  if (mode === "stipple" || mode === "sketch") {
    const step = variation === 1 ? 6 : variation === 2 ? 9 : 7;
    for (let y = step; y < h - 1; y += step) {
      for (let x = step; x < w - 1; x += step) {
        const jx = x + ((dotHash(x, y, variation) % 5) - 2);
        const jy = y + ((dotHash(y, x, variation + 3) % 5) - 2);
        if (jx < 1 || jy < 1 || jx >= w - 1 || jy >= h - 1) continue;
        const tone = soft[jy * w + jx] ?? 0;
        if (tone < 55) continue;
        if (mode === "sketch" && thick[jy * w + jx]) continue;
        const dot = tone > 150 ? 2 : 1;
        for (let dy = -dot; dy <= dot; dy += 1) {
          for (let dx = -dot; dx <= dot; dx += 1) {
            if (dx * dx + dy * dy > dot * dot) continue;
            inkAt(jx + dx, jy + dy);
          }
        }
      }
    }
  } else if (mode === "hatch") {
    const gap = variation === 1 ? 5 : 7;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if ((soft[y * w + x] ?? 0) < 70) continue;
        if ((x + y) % gap > 1) continue;
        inkAt(x, y);
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

export async function extractTattoo(src: string, transparent: boolean, variation = 0) {
  return renderSketch(src, "sketch", variation, transparent, false, 42, 2);
}

export async function makeStencil(
  src: string,
  mode: "outline" | "stipple" | "hatch" | "sketch",
  threshold: number,
  thickness: number,
  mirror: boolean,
  variation = 0,
) {
  return renderSketch(src, mode, variation, false, mirror, threshold, thickness);
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
