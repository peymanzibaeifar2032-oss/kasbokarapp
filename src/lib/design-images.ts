/** Compress a photo for tattoo reference storage (data URL). */

export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("فقط فایل تصویری انتخاب کنید.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const max = 1280;
    const scale = Math.min(1, max / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("پردازش عکس انجام نشد.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.76);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function filesToDataUrls(files: FileList | File[], limit: number) {
  const list = Array.from(files).slice(0, Math.max(0, limit));
  return Promise.all(list.map(compressImage));
}

export function downloadImage(src: string, filename: string) {
  if (src.startsWith("data:")) {
    const comma = src.indexOf(",");
    const meta = comma >= 0 ? src.slice(0, comma) : "data:image/jpeg;base64";
    const data = comma >= 0 ? src.slice(comma + 1) : src;
    const mime = /data:(.*?);/.exec(meta)?.[1] || "image/jpeg";
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return;
  }
  const link = document.createElement("a");
  link.href = src;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.click();
}

export function designFileName(prefix: string, index: number) {
  const safe = prefix.replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "tarh";
  return `${safe}-${index + 1}.jpg`;
}
