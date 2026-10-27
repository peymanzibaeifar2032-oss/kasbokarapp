import { useEffect, useState } from "react";
import { StudioTopBar } from "@/components/studio/top-bar";
import {
  downloadDataUrl,
  enhancePhoto,
  extractTattoo,
  fileToDataUrl,
  makeStencil,
  PAPERS,
  printSheets,
  shrinkDataUrl,
  stagePhoto,
  type PaperId,
} from "@/lib/tattoo-prep/process";
import {
  deleteAsset,
  deleteProject,
  exportBackup,
  importBackup,
  listAssets,
  listProjects,
  PrepStoreError,
  saveAsset,
  saveProject,
  type PrepAsset,
  type PrepKind,
  type PrepProject,
} from "@/lib/tattoo-prep/store";

type Tab = "idea" | "extract" | "design" | "stencil" | "print" | "enhance" | "photo" | "projects" | "library";

const TABS: { id: Tab; label: string }[] = [
  { id: "idea", label: "فرم ایده" },
  { id: "extract", label: "استخراج طرح" },
  { id: "design", label: "طراحی هوشمند" },
  { id: "stencil", label: "استنسیل" },
  { id: "print", label: "پرینت واقعی" },
  { id: "enhance", label: "بهبود عکس" },
  { id: "photo", label: "استودیو عکس" },
  { id: "projects", label: "پروژه‌ها" },
  { id: "library", label: "کتابخانه" },
];

const STYLES = [
  { fa: "رئال", en: "realism" },
  { fa: "بلک‌اندگری", en: "black and grey" },
  { fa: "فاین‌لاین", en: "fine line" },
  { fa: "سنتی", en: "american traditional" },
  { fa: "مینیمال", en: "minimal" },
  { fa: "قبیله‌ای", en: "tribal" },
  { fa: "ژاپنی", en: "japanese" },
  { fa: "کاور", en: "cover-up" },
];

const KIND_LABEL: Record<PrepKind, string> = {
  reference: "مرجع",
  extract: "استخراج",
  design: "طراحی",
  stencil: "استنسیل",
  enhance: "بهبود",
  photo: "عکس",
};

const field =
  "h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-3 text-sm text-[#f4f1ea] outline-none focus:border-[#b7955b]";
const area =
  "min-h-28 w-full rounded-2xl border border-white/15 bg-black/40 px-3 py-3 text-sm leading-7 text-[#f4f1ea] outline-none focus:border-[#b7955b]";
const gold =
  "inline-flex h-12 items-center justify-center rounded-2xl bg-[#b7955b] px-4 text-sm font-black text-black disabled:opacity-50";
const ghost =
  "inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 px-4 text-sm font-bold text-[#f4f1ea] disabled:opacity-50";

function blankProject(): PrepProject {
  return {
    id: "",
    name: "",
    phone: "",
    idea: "",
    placement: "",
    sizeCm: "",
    style: STYLES[0].fa,
    colorMode: "bw",
    updatedAt: "",
  };
}

function readDeviceId() {
  const key = "tattoo-prep-device";
  try {
    const existing = localStorage.getItem(key);
    if (existing && existing.length >= 8) return existing.slice(0, 80);
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return "local-device-fallback";
  }
}

function textOf(error: unknown) {
  if (error instanceof PrepStoreError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "انجام نشد.";
}

function extOf(dataUrl: string) {
  return dataUrl.startsWith("data:image/jpeg") ? "jpg" : "png";
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function postPrep(op: string, body: unknown) {
  const response = await fetch(`/api/tattoo-prep?op=${encodeURIComponent(op)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    image?: string;
    caption?: string;
    projects?: PrepProject[];
  };
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "انجام نشد.");
  return data;
}

async function syncProjects(deviceId: string) {
  const local = await listProjects();
  const remote = (await postPrep("list", { deviceId })).projects || [];
  for (const item of remote) {
    const known = local.find((row) => row.id === item.id);
    if (!known || String(item.updatedAt) > String(known.updatedAt)) await saveProject(item, true);
  }
  const fresh = await listProjects();
  for (const item of fresh) {
    const known = remote.find((row) => row.id === item.id);
    if (!known || String(item.updatedAt) > String(known.updatedAt)) {
      await postPrep("save", {
        deviceId,
        id: item.id,
        name: item.name,
        phone: item.phone,
        idea: item.idea,
        placement: item.placement,
        sizeCm: item.sizeCm,
        style: item.style,
        colorMode: item.colorMode,
      });
    }
  }
}

function readCentimeter(value: string) {
  const size = Number(value.replace(",", ".").trim());
  if (!Number.isFinite(size) || size < 1 || size > 120) {
    throw new Error("اندازه را بین ۱ تا ۱۲۰ سانتی‌متر بنویس.");
  }
  return size;
}

function openPrint(dataUrl: string, paper: PaperId) {
  if (!/^data:image\/(?:png|jpeg);base64,[a-z0-9+/=]+$/i.test(dataUrl)) {
    throw new Error("این برگه برای چاپ آماده نیست.");
  }
  const sheet = PAPERS[paper];
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("پنجره چاپ باز نشد. دانلود برگه را بزن.");
  popup.document.open();
  popup.document.write(
    `<!doctype html><meta charset="utf-8"><title>چاپ</title><style>@page{size:${sheet.w}mm ${sheet.h}mm;margin:0}html,body{margin:0;background:#fff}img{width:${sheet.w}mm;height:${sheet.h}mm;object-fit:contain}</style><img alt="" src="${dataUrl}">`,
  );
  popup.document.close();
  popup.onload = () => popup.print();
}

function DropZone({ label, multiple, onFiles }: { label: string; multiple?: boolean; onFiles: (files: File[]) => void }) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        onFiles([...event.dataTransfer.files]);
      }}
      className={`grid min-h-28 cursor-pointer place-items-center rounded-3xl border border-dashed px-4 py-6 text-center text-sm leading-7 ${
        over ? "border-[#b7955b] bg-[#b7955b]/10 text-[#e5d2ae]" : "border-white/20 bg-white/[.03] text-white/70"
      }`}
    >
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          onFiles([...(event.target.files || [])]);
          event.target.value = "";
        }}
      />
      {label}
    </label>
  );
}

function Picture({ src, onSave, filename }: { src: string; onSave: () => void; filename: string }) {
  if (!src) return null;
  return (
    <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-3">
      <img src={src} alt="" className="mx-auto max-h-[68vh] w-full rounded-2xl bg-white object-contain" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className={gold} onClick={onSave}>
          ذخیره در کتابخانه
        </button>
        <button type="button" className={ghost} onClick={() => downloadDataUrl(src, filename)}>
          دانلود
        </button>
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm text-white/70">
      <span className="mb-2 flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="text-[#e5d2ae]">{new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[#b7955b]"
      />
    </label>
  );
}

export function TattooPrepDesk() {
  const [tab, setTab] = useState<Tab>("idea");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [projects, setProjects] = useState<PrepProject[]>([]);
  const [assets, setAssets] = useState<PrepAsset[]>([]);
  const [form, setForm] = useState<PrepProject>(blankProject);
  const [refs, setRefs] = useState<PrepAsset[]>([]);
  const [source, setSource] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | PrepKind>("all");
  const [confirmId, setConfirmId] = useState("");
  const [deviceId, setDeviceId] = useState("");

  const [transparent, setTransparent] = useState(false);
  const [extracted, setExtracted] = useState("");
  const [prompt, setPrompt] = useState("");
  const [styleFa, setStyleFa] = useState(STYLES[0].fa);
  const [designColor, setDesignColor] = useState<"bw" | "color">("bw");
  const [copies, setCopies] = useState(1);
  const [versions, setVersions] = useState<string[]>([]);
  const [picked, setPicked] = useState(0);
  const [editNote, setEditNote] = useState("");
  const [stencilMode, setStencilMode] = useState<"outline" | "stipple" | "hatch">("outline");
  const [threshold, setThreshold] = useState(40);
  const [thickness, setThickness] = useState(2);
  const [mirror, setMirror] = useState(true);
  const [stencil, setStencil] = useState("");
  const [widthCm, setWidthCm] = useState("10");
  const [heightCm, setHeightCm] = useState("15");
  const [paper, setPaper] = useState<PaperId>("a4");
  const [pages, setPages] = useState<string[]>([]);
  const [scale, setScale] = useState(1);
  const [bright, setBright] = useState(0);
  const [contrast, setContrast] = useState(1.1);
  const [sharpen, setSharpen] = useState(0.4);
  const [denoise, setDenoise] = useState(0);
  const [enhanced, setEnhanced] = useState("");
  const [background, setBackground] = useState("studio");
  const [frame, setFrame] = useState<"post" | "story">("post");
  const [watermark, setWatermark] = useState("پیمان زیبائی‌فر");
  const [staged, setStaged] = useState("");
  const [caption, setCaption] = useState("");
  const [tone, setTone] = useState<"short" | "deep" | "bold">("short");

  function flash(text: string) {
    setError("");
    setNotice(text);
  }

  function fail(cause: unknown) {
    setNotice("");
    setError(textOf(cause));
  }

  async function refresh() {
    const [nextProjects, nextAssets] = await Promise.all([listProjects(), listAssets()]);
    setProjects(nextProjects);
    setAssets(nextAssets);
  }

  useEffect(() => {
    const id = readDeviceId();
    setDeviceId(id);
    refresh()
      .then(() => syncProjects(id).then(refresh))
      .catch(() => undefined);
  }, []);

  async function remember(assetKind: PrepKind, dataUrl: string, name: string) {
    await saveAsset({
      id: crypto.randomUUID(),
      projectId: form.id || null,
      kind: assetKind,
      name: name.slice(0, 80),
      dataUrl,
      createdAt: new Date().toISOString(),
    });
    await refresh();
    flash("در کتابخانه ذخیره شد.");
  }

  async function takeFiles(files: File[], multiple: boolean) {
    const pickedFiles = files.filter((file) => file.type.startsWith("image/")).slice(0, 8);
    if (!pickedFiles.length) {
      fail(new Error("فقط فایل تصویری بگذار."));
      return;
    }
    if (files.length > 8) flash("حداکثر هشت عکس برداشته می‌شود.");
    setBusy("خواندن عکس");
    try {
      const next: PrepAsset[] = [];
      for (const file of pickedFiles) {
        next.push({
          id: crypto.randomUUID(),
          projectId: form.id || null,
          kind: "reference",
          name: file.name.slice(0, 80) || "مرجع",
          dataUrl: await fileToDataUrl(file),
          createdAt: new Date().toISOString(),
        });
      }
      if (multiple) setRefs((current) => [...current, ...next].slice(0, 8));
      else setSource(next[0]?.dataUrl || "");
      if (!multiple) flash("عکس آماده است.");
    } catch (cause) {
      fail(cause);
    } finally {
      setBusy("");
    }
  }

  function useImage(dataUrl: string, next: Tab) {
    setSource(dataUrl);
    setExtracted("");
    setStencil("");
    setEnhanced("");
    setStaged("");
    setPages([]);
    setTab(next);
    flash("عکس به ابزار فرستاده شد.");
  }

  async function saveForm() {
    const name = form.name.trim().slice(0, 80);
    if (!name) {
      fail(new Error("نام مشتری را بنویس."));
      return;
    }
    setBusy("ذخیره");
    try {
      const saved = await saveProject({
        ...form,
        id: form.id || crypto.randomUUID(),
        name,
        phone: form.phone.trim().slice(0, 40),
        idea: form.idea.trim().slice(0, 2000),
        placement: form.placement.trim().slice(0, 120),
        sizeCm: form.sizeCm.trim().slice(0, 40),
        style: form.style.trim().slice(0, 80) || STYLES[0].fa,
        updatedAt: new Date().toISOString(),
      });
      setForm(saved);
      for (const ref of refs) await saveAsset({ ...ref, projectId: saved.id });
      setRefs([]);
      try {
        await postPrep("save", { deviceId, ...saved });
        flash("پروژه ذخیره شد.");
      } catch {
        flash("روی همین دستگاه ذخیره شد. اتصال سرور برقرار نشد.");
      }
      await refresh();
    } catch (cause) {
      fail(cause);
    } finally {
      setBusy("");
    }
  }

  function downloadBrief() {
    const lines = [
      `نام: ${form.name}`,
      `تماس: ${form.phone}`,
      `ایده: ${form.idea}`,
      `جای بدن: ${form.placement}`,
      `اندازه: ${form.sizeCm} سانتی‌متر`,
      `سبک: ${form.style}`,
      `رنگ: ${form.colorMode === "color" ? "رنگی" : "سیاه‌وسفید"}`,
    ];
    downloadBlob("ideye-moshtari.txt", new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
  }

  function openProject(project: PrepProject) {
    setForm(project);
    setPrompt(project.idea);
    setStyleFa(STYLES.some((item) => item.fa === project.style) ? project.style : STYLES[0].fa);
    setDesignColor(project.colorMode);
    const size = Number(String(project.sizeCm).replace(",", "."));
    if (size > 0 && size <= 120) {
      setWidthCm(String(size));
      setHeightCm(String(size));
    }
    const latest = assets.find((asset) => asset.projectId === project.id);
    if (latest) setSource(latest.dataUrl);
    setTab("idea");
    flash("پروژه باز شد.");
  }

  async function run(label: string, work: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await work();
    } catch (cause) {
      fail(cause);
    } finally {
      setBusy("");
    }
  }

  const styleEn = STYLES.find((item) => item.fa === styleFa)?.en || "realism";
  const filteredProjects = projects.filter((project) => {
    const haystack = [project.name, project.phone, project.idea, project.placement, project.style].join(" ");
    return haystack.includes(query.trim());
  });
  const filteredAssets = assets.filter((asset) => kind === "all" || asset.kind === kind);
  const currentDesign = versions[picked] || "";

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#0b0b0c] text-[#f4f1ea]" dir="rtl">
      <StudioTopBar compact />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5">
        <div>
          <a href="/studio" className="text-sm text-[#e5d2ae]">
            بازگشت به استودیو
          </a>
          <h1 className="mt-2 text-3xl font-black leading-tight">ابزارهای آماده‌سازی طرح تاتو</h1>
          <p className="mt-2 text-sm leading-7 text-white/55">
            فرم، استخراج، طراحی، استنسیل، پرینت و عکس. متن پروژه اگر اینترنت باشد روی سرور می‌ماند؛ خود عکس‌ها روی همین دستگاه ذخیره می‌شوند.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setError("");
              }}
              className={
                tab === item.id
                  ? "h-11 rounded-full bg-[#b7955b] px-3 text-sm font-black text-black"
                  : "h-11 rounded-full border border-white/15 px-3 text-sm text-white/80"
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        {notice ? <p className="rounded-2xl border border-[#b7955b]/40 bg-[#b7955b]/10 px-4 py-3 text-sm leading-7 text-[#f0e2c4]">{notice}</p> : null}
        {error ? <p className="rounded-2xl border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm leading-7 text-red-100">{error}</p> : null}
        {busy ? <p className="text-sm text-white/55">در حال {busy}…</p> : null}

        {tab === "idea" ? (
          <section className="grid gap-3">
            <p className="text-sm leading-7 text-white/60">هر فرم یک پروژه است. عکس مرجع را بکش و رها کن.</p>
            <input className={field} placeholder="نام مشتری" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <input className={field} placeholder="شماره تماس" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <textarea className={area} placeholder="ایده مشتری را بنویس" value={form.idea} onChange={(event) => setForm({ ...form, idea: event.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className={field} placeholder="جای بدن" value={form.placement} onChange={(event) => setForm({ ...form, placement: event.target.value })} />
              <input className={field} placeholder="اندازه به سانتی‌متر" inputMode="decimal" value={form.sizeCm} onChange={(event) => setForm({ ...form, sizeCm: event.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className={field} value={form.style} onChange={(event) => setForm({ ...form, style: event.target.value })}>
                {STYLES.map((item) => (
                  <option key={item.fa} value={item.fa}>
                    {item.fa}
                  </option>
                ))}
              </select>
              <select className={field} value={form.colorMode} onChange={(event) => setForm({ ...form, colorMode: event.target.value === "color" ? "color" : "bw" })}>
                <option value="bw">سیاه‌وسفید</option>
                <option value="color">رنگی</option>
              </select>
            </div>
            <DropZone label="عکس‌های مرجع را اینجا رها کن یا برای انتخاب بزن" multiple onFiles={(files) => takeFiles(files, true)} />
            {refs.length ? (
              <div className="grid grid-cols-3 gap-2">
                {refs.map((ref) => (
                  <button key={ref.id} type="button" className="overflow-hidden rounded-2xl border border-white/10" onClick={() => setRefs((current) => current.filter((item) => item.id !== ref.id))}>
                    <img src={ref.dataUrl} alt="" className="aspect-square w-full object-cover" />
                    <span className="block px-2 py-1 text-xs text-white/60">حذف</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={gold} disabled={Boolean(busy)} onClick={saveForm}>
                ذخیره پروژه
              </button>
              <button type="button" className={ghost} onClick={downloadBrief}>
                دانلود فرم
              </button>
            </div>
          </section>
        ) : null}

        {tab !== "idea" && tab !== "projects" && tab !== "library" && tab !== "design" ? (
          <section className="grid gap-3">
            <DropZone label="عکس کار را رها کن، یا از کتابخانه بفرست" onFiles={(files) => takeFiles(files, false)} />
            {source ? <img src={source} alt="" className="max-h-40 w-full rounded-2xl bg-white object-contain" /> : <p className="text-sm text-white/50">هنوز عکسی انتخاب نشده.</p>}
          </section>
        ) : null}

        {tab === "extract" ? (
          <section className="grid gap-3">
            <p className="text-sm leading-7 text-white/60">رنگ پوست و کاغذ روشن برداشته می‌شود و خط‌ها روی زمینه سفید یا شفاف می‌مانند.</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={transparent} onChange={(event) => setTransparent(event.target.checked)} />
              زمینه شفاف
            </label>
            <button
              type="button"
              className={gold}
              disabled={Boolean(busy)}
              onClick={() =>
                run("استخراج", async () => {
                  if (!source) throw new Error("اول عکس تاتو را بگذار.");
                  setExtracted(await extractTattoo(source, transparent));
                })
              }
            >
              استخراج طرح
            </button>
            <Picture src={extracted} filename={`estekhraj.${extOf(extracted)}`} onSave={() => run("ذخیره", () => remember("extract", extracted, "استخراج"))} />
          </section>
        ) : null}

        {tab === "design" ? (
          <section className="grid gap-3">
            <p className="text-sm leading-7 text-white/60">طرح از متن فارسی ساخته می‌شود. هر ساخت از سهم ساعت کم می‌کند؛ حداکثر شش تصویر در ساعت.</p>
            <textarea className={area} placeholder="ایده طرح را فارسی بنویس" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <select className={field} value={styleFa} onChange={(event) => setStyleFa(event.target.value)}>
                {STYLES.map((item) => (
                  <option key={item.fa} value={item.fa}>
                    {item.fa}
                  </option>
                ))}
              </select>
              <select className={field} value={designColor} onChange={(event) => setDesignColor(event.target.value === "color" ? "color" : "bw")}>
                <option value="bw">سیاه‌وسفید</option>
                <option value="color">رنگی</option>
              </select>
            </div>
            <label className="text-sm text-white/70">
              تعداد نسخه
              <select className={`${field} mt-2`} value={copies} onChange={(event) => setCopies(Number(event.target.value))}>
                <option value={1}>یک نسخه</option>
                <option value={2}>دو نسخه</option>
                <option value={3}>سه نسخه</option>
              </select>
            </label>
            <button
              type="button"
              className={gold}
              disabled={Boolean(busy)}
              onClick={() =>
                run("ساخت طرح", async () => {
                  const idea = prompt.trim();
                  if (idea.length < 2) throw new Error("ایده را کمی بیشتر بنویس.");
                  const made: string[] = [];
                  for (let index = 0; index < copies; index += 1) {
                    const data = await postPrep("generate", { idea, style: styleEn, colorMode: designColor });
                    if (!data.image) throw new Error("تصویری برنگشت.");
                    made.push(data.image);
                  }
                  setVersions((current) => [...current, ...made]);
                  setPicked(versions.length + made.length - 1);
                })
              }
            >
              ساخت طرح
            </button>
            {versions.length ? (
              <div className="grid grid-cols-2 gap-2">
                {versions.map((image, index) => (
                  <button key={`${index}-${image.slice(-24)}`} type="button" className={`overflow-hidden rounded-2xl border ${index === picked ? "border-[#b7955b]" : "border-white/10"}`} onClick={() => setPicked(index)}>
                    <img src={image} alt="" className="aspect-square w-full bg-white object-contain" />
                  </button>
                ))}
              </div>
            ) : null}
            <textarea className={area} placeholder="برای ویرایش نسخه انتخاب‌شده بنویس چه چیزی عوض شود" value={editNote} onChange={(event) => setEditNote(event.target.value)} />
            <button
              type="button"
              className={ghost}
              disabled={Boolean(busy)}
              onClick={() =>
                run("ویرایش", async () => {
                  if (!currentDesign) throw new Error("اول یک نسخه بساز.");
                  let sourceImage = currentDesign.length > 1_100_000 ? await shrinkDataUrl(currentDesign, 720) : currentDesign;
                  if (sourceImage.length > 1_100_000) sourceImage = await shrinkDataUrl(currentDesign, 480);
                  const idea = `${prompt.trim() || "طرح تاتو"}. ویرایش: ${editNote.trim() || "خطوط را تمیزتر و قابل استنسیل کن"}`;
                  const data = await postPrep("generate", { idea, style: styleEn, colorMode: designColor, image: sourceImage });
                  if (!data.image) throw new Error("تصویری برنگشت.");
                  const nextImage = data.image;
                  setVersions((current) => [...current, nextImage]);
                  setPicked(versions.length);
                })
              }
            >
              ویرایش نسخه انتخاب‌شده
            </button>
            <Picture src={currentDesign} filename={`tarahi.${extOf(currentDesign)}`} onSave={() => run("ذخیره", () => remember("design", currentDesign, "طراحی"))} />
          </section>
        ) : null}

        {tab === "stencil" ? (
          <section className="grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["outline", "خط دور"],
                  ["stipple", "سایه نقطه‌ای"],
                  ["hatch", "هاشور"],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" className={stencilMode === id ? gold : ghost} onClick={() => setStencilMode(id)}>
                  {label}
                </button>
              ))}
            </div>
            <Slider label="ضخامت خط" min={1} max={6} step={1} value={thickness} onChange={setThickness} />
            <Slider label="آستانه" min={10} max={180} step={1} value={threshold} onChange={setThreshold} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={mirror} onChange={(event) => setMirror(event.target.checked)} />
              آینه‌ای برای کاغذ ترانسفر
            </label>
            <button
              type="button"
              className={gold}
              disabled={Boolean(busy)}
              onClick={() =>
                run("استنسیل", async () => {
                  if (!source) throw new Error("اول عکس طرح را بگذار.");
                  setStencil(await makeStencil(source, stencilMode, threshold, thickness, mirror));
                })
              }
            >
              ساخت استنسیل
            </button>
            <Picture src={stencil} filename="stensil.png" onSave={() => run("ذخیره", () => remember("stencil", stencil, "استنسیل"))} />
          </section>
        ) : null}

        {tab === "print" ? (
          <section className="grid gap-3">
            <p className="text-sm leading-7 text-white/60">در تنظیمات چاپ، مقیاس را ۱۰۰٪ بگذار نه «جا شدن در صفحه». علامت ضربدر گوشه‌ها برای چسباندن برگه‌هاست.</p>
            <div className="grid grid-cols-2 gap-2">
              <input className={field} inputMode="decimal" value={widthCm} onChange={(event) => setWidthCm(event.target.value)} placeholder="پهنا سانتی‌متر" />
              <input className={field} inputMode="decimal" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} placeholder="بلندا سانتی‌متر" />
            </div>
            <select className={field} value={paper} onChange={(event) => setPaper(event.target.value as PaperId)}>
              <option value="a4">A4</option>
              <option value="a3">A3</option>
              <option value="letter">Letter</option>
            </select>
            <button
              type="button"
              className={gold}
              disabled={Boolean(busy)}
              onClick={() =>
                run("آماده‌سازی چاپ", async () => {
                  if (!source) throw new Error("اول طرح را بگذار.");
                  const result = await printSheets(source, readCentimeter(widthCm), readCentimeter(heightCm), paper);
                  setPages(result.pages);
                  flash(`${new Intl.NumberFormat("fa-IR").format(result.plan.pages)} برگه آماده شد.`);
                })
              }
            >
              تقسیم روی برگه
            </button>
            {pages.map((page, index) => (
              <div key={`${index}-${page.slice(-16)}`} className="rounded-3xl border border-white/10 bg-black/30 p-3">
                <img src={page} alt="" className="w-full rounded-2xl bg-white object-contain" />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" className={gold} onClick={() => downloadDataUrl(page, `chap-${index + 1}.png`)}>
                    دانلود برگه {new Intl.NumberFormat("fa-IR").format(index + 1)}
                  </button>
                  <button
                    type="button"
                    className={ghost}
                    onClick={() => {
                      try {
                        openPrint(page, paper);
                      } catch (cause) {
                        fail(cause);
                      }
                    }}
                  >
                    چاپ این برگه
                  </button>
                </div>
              </div>
            ))}
            {pages[0] ? (
              <button type="button" className={ghost} onClick={() => run("ذخیره", () => remember("stencil", pages[0], "پرینت"))}>
                ذخیره برگه اول در کتابخانه
              </button>
            ) : null}
          </section>
        ) : null}

        {tab === "enhance" ? (
          <section className="grid gap-3">
            <Slider label="بزرگ‌نمایی" min={1} max={2} step={0.1} value={scale} onChange={setScale} />
            <Slider label="روشنایی" min={-40} max={40} step={1} value={bright} onChange={setBright} />
            <Slider label="کنتراست" min={0.6} max={1.8} step={0.1} value={contrast} onChange={setContrast} />
            <Slider label="شارپ" min={0} max={1.2} step={0.1} value={sharpen} onChange={setSharpen} />
            <Slider label="حذف نویز" min={0} max={2} step={0.1} value={denoise} onChange={setDenoise} />
            <button
              type="button"
              className={gold}
              disabled={Boolean(busy)}
              onClick={() =>
                run("بهبود", async () => {
                  if (!source) throw new Error("اول عکس را بگذار.");
                  setEnhanced(await enhancePhoto(source, { scale, bright, contrast, sharpen, denoise }));
                })
              }
            >
              بهبود عکس
            </button>
            <Picture src={enhanced} filename="behbod.jpg" onSave={() => run("ذخیره", () => remember("enhance", enhanced, "بهبود"))} />
          </section>
        ) : null}

        {tab === "photo" ? (
          <section className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <select className={field} value={background} onChange={(event) => setBackground(event.target.value)}>
                <option value="studio">استودیو</option>
                <option value="dark">تیره</option>
                <option value="cream">کرم</option>
                <option value="led">نور آبی</option>
              </select>
              <select className={field} value={frame} onChange={(event) => setFrame(event.target.value === "story" ? "story" : "post")}>
                <option value="post">پست اینستاگرام</option>
                <option value="story">استوری</option>
              </select>
            </div>
            <input className={field} placeholder="واترمارک" value={watermark} onChange={(event) => setWatermark(event.target.value)} />
            <button
              type="button"
              className={gold}
              disabled={Boolean(busy)}
              onClick={() =>
                run("ساخت عکس", async () => {
                  if (!source) throw new Error("اول عکس را بگذار.");
                  setStaged(await stagePhoto(source, background, frame, watermark));
                })
              }
            >
              ساخت قاب عکس
            </button>
            <Picture src={staged} filename={frame === "story" ? "story.jpg" : "post.jpg"} onSave={() => run("ذخیره", () => remember("photo", staged, frame === "story" ? "استوری" : "پست"))} />
            <select className={field} value={tone} onChange={(event) => setTone(event.target.value as "short" | "deep" | "bold")}>
              <option value="short">کپشن ساده</option>
              <option value="deep">کپشن آرام</option>
              <option value="bold">کپشن محکم</option>
            </select>
            <button
              type="button"
              className={ghost}
              disabled={Boolean(busy)}
              onClick={() =>
                run("کپشن", async () => {
                  const data = await postPrep("caption", { idea: prompt || form.idea, style: styleFa, tone });
                  setCaption(data.caption || "");
                })
              }
            >
              ساخت کپشن و هشتگ
            </button>
            <textarea className={area} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="کپشن اینجا می‌آید" />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={gold}
                onClick={() => {
                  if (!caption.trim()) {
                    fail(new Error("اول کپشن را بساز."));
                    return;
                  }
                  navigator.clipboard.writeText(caption).then(
                    () => flash("کپشن کپی شد."),
                    () => fail(new Error("کپی نشد. متن را دستی بردار.")),
                  );
                }}
              >
                ذخیره در حافظه
              </button>
              <button
                type="button"
                className={ghost}
                onClick={() => {
                  if (!caption.trim()) {
                    fail(new Error("اول کپشن را بساز."));
                    return;
                  }
                  downloadBlob("caption.txt", new Blob([caption], { type: "text/plain;charset=utf-8" }));
                }}
              >
                دانلود کپشن
              </button>
            </div>
          </section>
        ) : null}

        {tab === "projects" ? (
          <section className="grid gap-3">
            <input className={field} placeholder="جستجو در نام، تماس یا ایده" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={gold}
                onClick={() =>
                  run("بکاپ", async () => {
                    const raw = await exportBackup();
                    downloadBlob("tattoo-prep-backup.json", new Blob([raw], { type: "application/json" }));
                  })
                }
              >
                دانلود بکاپ
              </button>
              <label className={ghost}>
                وارد کردن بکاپ
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    run("ورود بکاپ", async () => {
                      await importBackup(await file.text());
                      await refresh();
                      flash("بکاپ وارد شد.");
                    });
                  }}
                />
              </label>
            </div>
            {filteredProjects.length ? (
              filteredProjects.map((project) => (
                <article key={project.id} className="rounded-3xl border border-white/10 bg-white/[.03] p-4">
                  <h2 className="break-words text-lg font-black">{project.name}</h2>
                  <p className="mt-1 break-words text-sm leading-7 text-white/60">
                    {[project.phone, project.placement, project.sizeCm ? `${project.sizeCm} سانتی‌متر` : "", project.style]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {project.idea ? <p className="mt-2 break-words text-sm leading-7 text-white/80">{project.idea}</p> : null}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" className={gold} onClick={() => openProject(project)}>
                      باز کردن
                    </button>
                    {confirmId === `project:${project.id}` ? (
                      <button
                        type="button"
                        className={ghost}
                        onClick={() =>
                          run("حذف", async () => {
                            await deleteProject(project.id);
                            try {
                              await postPrep("delete", { deviceId, id: project.id });
                            } catch {
                              flash("از این دستگاه حذف شد. اگر اینترنت قطع باشد ممکن است دوباره دیده شود.");
                            }
                            if (form.id === project.id) setForm(blankProject());
                            setConfirmId("");
                            await refresh();
                          })
                        }
                      >
                        حتماً حذف شود
                      </button>
                    ) : (
                      <button type="button" className={ghost} onClick={() => setConfirmId(`project:${project.id}`)}>
                        حذف
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-white/50">پروژه‌ای با این جستجو نیست.</p>
            )}
          </section>
        ) : null}

        {tab === "library" ? (
          <section className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={kind === "all" ? gold : ghost} onClick={() => setKind("all")}>
                همه
              </button>
              {(Object.keys(KIND_LABEL) as PrepKind[]).map((item) => (
                <button key={item} type="button" className={kind === item ? gold : ghost} onClick={() => setKind(item)}>
                  {KIND_LABEL[item]}
                </button>
              ))}
            </div>
            {filteredAssets.length ? (
              filteredAssets.map((asset) => (
                <article key={asset.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.03]">
                  <img src={asset.dataUrl} alt="" className="max-h-72 w-full bg-white object-contain" />
                  <div className="grid gap-2 p-3">
                    <p className="break-words text-sm text-white/70">
                      {KIND_LABEL[asset.kind] || "طرح"} · {asset.name}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className={gold} onClick={() => downloadDataUrl(asset.dataUrl, `${asset.kind}.${extOf(asset.dataUrl)}`)}>
                        دانلود
                      </button>
                      <button type="button" className={ghost} onClick={() => useImage(asset.dataUrl, "stencil")}>
                        فرستادن به استنسیل
                      </button>
                      <button type="button" className={ghost} onClick={() => useImage(asset.dataUrl, "print")}>
                        فرستادن به پرینت
                      </button>
                      {confirmId === `asset:${asset.id}` ? (
                        <button
                          type="button"
                          className={ghost}
                          onClick={() =>
                            run("حذف", async () => {
                              await deleteAsset(asset.id);
                              setConfirmId("");
                              await refresh();
                            })
                          }
                        >
                          حتماً حذف شود
                        </button>
                      ) : (
                        <button type="button" className={ghost} onClick={() => setConfirmId(`asset:${asset.id}`)}>
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-white/50">در این بخش طرحی ذخیره نشده.</p>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
