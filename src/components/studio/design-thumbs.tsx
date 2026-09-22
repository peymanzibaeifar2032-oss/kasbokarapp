import { Download, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { designFileName, downloadImage, filesToDataUrls } from "@/lib/design-images";
import { friendlyError } from "@/lib/save";
import { cn } from "@/lib/utils";

export function DesignThumbs({
  images,
  filePrefix,
  onFiles,
  onRemove,
  max = 3,
  tone = "light",
}: {
  images: string[];
  filePrefix: string;
  onFiles?: (urls: string[]) => void;
  onRemove?: (index: number) => void;
  max?: number;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  async function pick(files: FileList | null) {
    if (!onFiles || !files?.length) return;
    try {
      const urls = await filesToDataUrls(files, max - images.length);
      if (urls.length) onFiles(urls);
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }
  if (!images.length && !onFiles) return null;
  return (
    <div className="mt-3">
      {onFiles && images.length < max ? (
        <label
          className={cn(
            "mb-2 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm",
            dark ? "border-white/15" : "border-border bg-bg",
          )}
        >
          <ImagePlus className="size-4" /> آپلود طرح
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              void pick(e.target.files);
              e.currentTarget.value = "";
            }}
          />
        </label>
      ) : null}
      {images.length ? (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((src, index) => (
            <div key={`${src.slice(-24)}-${index}`} className="relative size-24 shrink-0">
              <img
                src={src}
                alt={`طرح ${index + 1}`}
                className={cn(
                  "size-24 rounded-xl border object-cover",
                  dark ? "border-white/10" : "border-border",
                )}
              />
              <div className="absolute inset-x-0 bottom-0 flex overflow-hidden rounded-b-xl">
                <button
                  type="button"
                  className="flex h-7 flex-1 items-center justify-center bg-black/70 text-[10px] text-white"
                  onClick={() => downloadImage(src, designFileName(filePrefix, index))}
                >
                  <Download className="ml-1 size-3" /> دانلود
                </button>
                {onRemove ? (
                  <button
                    type="button"
                    className="h-7 px-2 bg-black/80 text-[10px] text-white"
                    onClick={() => onRemove(index)}
                  >
                    حذف
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
