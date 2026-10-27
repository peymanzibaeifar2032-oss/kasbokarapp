export type PrepProject = {
  id: string;
  name: string;
  phone: string;
  idea: string;
  placement: string;
  sizeCm: string;
  style: string;
  colorMode: "color" | "bw";
  updatedAt: string;
};

export type PrepKind = "reference" | "extract" | "design" | "stencil" | "enhance" | "photo";

export type PrepAsset = {
  id: string;
  projectId: string | null;
  kind: PrepKind;
  name: string;
  dataUrl: string;
  createdAt: string;
};

const DB_NAME = "kasbokar-tattoo-prep";
const PROJECT_KEY = "tattoo-prep-projects";

export class PrepStoreError extends Error {
  quota: boolean;
  constructor(message: string, quota: boolean) {
    super(message);
    this.quota = quota;
  }
}

function quotaError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  const text = error instanceof Error ? error.message : String(error);
  return name === "QuotaExceededError" || /quota|exceeded/i.test(text);
}

function fail(error: unknown): never {
  if (quotaError(error)) {
    throw new PrepStoreError("حافظه دستگاه پر شده. بکاپ بگیر و چند طرح قدیمی را حذف کن.", true);
  }
  throw new PrepStoreError("ذخیره انجام نشد. یک بار دیگر تلاش کن.", false);
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
      if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readLocalProjects(): PrepProject[] {
  try {
    const raw = localStorage.getItem(PROJECT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PrepProject[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalProjects(projects: PrepProject[]) {
  try {
    localStorage.setItem(PROJECT_KEY, JSON.stringify(projects.map(({ ...project }) => project)));
  } catch (error) {
    fail(error);
  }
}

const KINDS = new Set<PrepKind>(["reference", "extract", "design", "stencil", "enhance", "photo"]);

function asKind(value: string): PrepKind | null {
  return KINDS.has(value as PrepKind) ? (value as PrepKind) : null;
}

export async function listProjects() {
  try {
    const db = await openDb();
    const rows = await requestToPromise(db.transaction("projects").objectStore("projects").getAll());
    const projects = (rows as PrepProject[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    writeLocalProjects(projects);
    return projects;
  } catch {
    return readLocalProjects().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

export async function saveProject(project: PrepProject, keepTime = false) {
  const next = {
    ...project,
    updatedAt: keepTime && project.updatedAt ? project.updatedAt : new Date().toISOString(),
  };
  const local = readLocalProjects().filter((item) => item.id !== next.id);
  local.unshift(next);
  writeLocalProjects(local);
  try {
    const db = await openDb();
    await requestToPromise(db.transaction("projects", "readwrite").objectStore("projects").put(next));
  } catch (error) {
    if (quotaError(error)) fail(error);
  }
  return next;
}

export async function deleteProject(id: string) {
  writeLocalProjects(readLocalProjects().filter((item) => item.id !== id));
  try {
    const db = await openDb();
    const tx = db.transaction(["projects", "assets"], "readwrite");
    tx.objectStore("projects").delete(id);
    const assets = await requestToPromise(tx.objectStore("assets").getAll());
    for (const asset of assets as PrepAsset[]) {
      if (asset.projectId === id) tx.objectStore("assets").delete(asset.id);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    if (quotaError(error)) fail(error);
  }
}

export async function listAssets() {
  try {
    const db = await openDb();
    const rows = await requestToPromise(db.transaction("assets").objectStore("assets").getAll());
    return (rows as PrepAsset[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function saveAsset(asset: PrepAsset) {
  try {
    const db = await openDb();
    await requestToPromise(db.transaction("assets", "readwrite").objectStore("assets").put(asset));
    return asset;
  } catch (error) {
    fail(error);
  }
}

export async function deleteAsset(id: string) {
  try {
    const db = await openDb();
    await requestToPromise(db.transaction("assets", "readwrite").objectStore("assets").delete(id));
  } catch (error) {
    if (quotaError(error)) fail(error);
  }
}

export async function exportBackup() {
  const projects = await listProjects();
  const assets = await listAssets();
  return JSON.stringify({ version: 1, projects, assets });
}

export async function importBackup(raw: string) {
  const parsed = JSON.parse(raw) as { projects?: PrepProject[]; assets?: PrepAsset[] };
  const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
  const assets = Array.isArray(parsed.assets) ? parsed.assets : [];
  for (const project of projects) {
    if (!project?.id || typeof project.name !== "string") continue;
    await saveProject({
      id: String(project.id).slice(0, 80),
      name: String(project.name).slice(0, 80),
      phone: String(project.phone || "").slice(0, 40),
      idea: String(project.idea || "").slice(0, 2000),
      placement: String(project.placement || "").slice(0, 120),
      sizeCm: String(project.sizeCm || "").slice(0, 40),
      style: String(project.style || "").slice(0, 80),
      colorMode: project.colorMode === "color" ? "color" : "bw",
      updatedAt: project.updatedAt || new Date().toISOString(),
    }, true);
  }
  for (const asset of assets) {
    if (!asset?.id || typeof asset.dataUrl !== "string" || !asset.dataUrl.startsWith("data:image/")) continue;
    const kind = asKind(String(asset.kind || ""));
    if (!kind) continue;
    await saveAsset({
      id: String(asset.id).slice(0, 80),
      projectId: asset.projectId ? String(asset.projectId).slice(0, 80) : null,
      kind,
      name: String(asset.name || "طرح").slice(0, 80),
      dataUrl: asset.dataUrl,
      createdAt: asset.createdAt || new Date().toISOString(),
    });
  }
}
