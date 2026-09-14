"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlusIcon, PaperclipIcon, PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api/client";
import { completeUpload, listUploads, signUpload } from "@/lib/api/uploads";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/generated/api";

type AssemblyResult = {
  assembly_id?: string;
  ok?: string;
  uploads?: { ssl_url?: string; url?: string }[];
  results?: Record<string, { ssl_url?: string; url?: string }[]>;
};

export type ComposerAttachment = Attachment & { uploadProgress?: number };

export function isPendingAttachment(item: Attachment) {
  return item.id.startsWith("pending:");
}

export function attachmentPreviewUrl(item: Attachment) {
  return item.durableUrl ?? item.resultUrl;
}

function uploadProgressOf(item: ComposerAttachment) {
  if (!isPendingAttachment(item)) return undefined;
  return typeof item.uploadProgress === "number" ? item.uploadProgress : 0;
}

export function AttachmentPreviewRow({
  attachments,
  onRemove,
}: {
  attachments: ComposerAttachment[];
  onRemove: (id: string) => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <ul className="mb-3 flex flex-wrap gap-3">
      {attachments.map((item) => {
        const src = attachmentPreviewUrl(item);
        const pending = isPendingAttachment(item);
        const progress = uploadProgressOf(item);
        const image = item.mimeType.startsWith("image/") && src;
        const video = item.mimeType.startsWith("video/") && src;

        return (
          <li key={item.id} className="relative size-[72px]">
            <div
              className={cn(
                "size-full overflow-hidden rounded-[16px] bg-muted transition-opacity duration-300",
                pending && "opacity-40",
              )}
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={item.originalName} className="size-full object-cover" />
              ) : video ? (
                <video src={src} muted className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">
                  {item.originalName}
                </div>
              )}
            </div>
            {pending && progress !== undefined ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[16px] bg-black/25">
                <UploadProgressRing value={progress} label={`Uploading ${item.originalName}`} />
              </div>
            ) : null}
            <button
              type="button"
              aria-label={`Remove ${item.originalName}`}
              className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
              onClick={() => onRemove(item.id)}
            >
              <XIcon className="size-3" strokeWidth={2.5} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function UploadProgressRing({ value, label }: { value: number; label: string }) {
  const size = 28;
  const stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - clamped / 100);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="text-white/30"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="text-white transition-[stroke-dashoffset] duration-150 ease-out"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

export function AttachButton({
  chatId,
  attachments,
  onChange,
  placement = "bottom",
}: {
  chatId?: string;
  attachments: ComposerAttachment[];
  onChange: (next: ComposerAttachment[]) => void;
  placement?: "top" | "bottom";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const uppyRef = useRef<{ cancelAll: () => void } | null>(null);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"menu" | "library">("menu");
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState<Attachment[]>([]);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    void listUploads(chatId)
      .then((data) => setLibrary(data.items))
      .catch(() => setLibrary([]));
  }, [chatId, attachments.length]);

  useEffect(() => {
    if (!attachments.some(isPendingAttachment)) {
      uppyRef.current?.cancelAll();
    }
  }, [attachments]);

  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({
        top: placement === "top" ? rect.top - 8 : rect.bottom + 8,
        left: rect.left,
      });
    }
    place();
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
      setPanel("menu");
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setPanel("menu");
      }
    }
    window.addEventListener("resize", place);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, placement]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const next = [...attachments];
    try {
      for (const file of files) {
        const pending = makePendingAttachment(file, next.length);
        next.push(pending);
        onChange([...next]);
        const saved = await uploadOne(file, pending, (percent) => {
          const current = next.findIndex((item) => item.id === pending.id);
          if (current < 0) return;
          next[current] = { ...next[current], uploadProgress: percent };
          onChange([...next]);
        });
        const index = next.findIndex((item) => item.id === pending.id);
        revokePreview(pending);
        if (index >= 0) next[index] = saved;
        else next.push(saved);
        onChange([...next]);
      }
    } catch (err) {
      const leftover = next.filter((item) => !isPendingAttachment(item));
      next.filter(isPendingAttachment).forEach(revokePreview);
      onChange(leftover);
      toast.error(
        err instanceof ApiClientError
          ? err.body.message
          : err instanceof Error
            ? err.message
            : "Upload failed",
      );
    } finally {
      setBusy(false);
      uppyRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function uploadOne(
    file: File,
    pending: ComposerAttachment,
    onProgress: (percent: number) => void,
  ): Promise<Attachment> {
    const signed = await signUpload({
      mimeType: file.type,
      byteSize: file.size,
      originalName: file.name,
    });
    const { assemblyId, resultUrl, assemblyStatus } = await uploadWithUppy(file, signed, onProgress);
    return completeUpload({
      chatId,
      assemblyId,
      mimeType: file.type,
      byteSize: file.size,
      originalName: file.name,
      resultUrl,
      assemblyStatus,
      sortOrder: pending.sortOrder,
    });
  }

  function toggleLibraryItem(item: Attachment) {
    const exists = attachments.some((entry) => entry.id === item.id);
    onChange(exists ? attachments.filter((entry) => entry.id !== item.id) : [...attachments, item]);
    setOpen(false);
    setPanel("menu");
  }

  function startDeviceUpload() {
    setOpen(false);
    setPanel("menu");
    window.setTimeout(() => inputRef.current?.click(), 0);
  }

  return (
    <div ref={triggerRef} className="relative">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Attach file"
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={busy}
        className="size-6 border-0 bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground focus-visible:border-0 focus-visible:ring-0"
        onClick={() => {
          const rect = triggerRef.current?.getBoundingClientRect();
          if (rect) {
            setCoords({
              top: placement === "top" ? rect.top - 8 : rect.bottom + 8,
              left: rect.left,
            });
          }
          setOpen((value) => !value);
          setPanel("menu");
        }}
      >
        <PaperclipIcon className="size-4" strokeWidth={1.75} />
      </Button>
      {open && coords
        ? createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Add a file"
          style={{
            top: coords.top,
            left: coords.left,
            transform: placement === "top" ? "translateY(-100%)" : undefined,
          }}
          className="fixed z-50 w-[280px] rounded-[20px] bg-card p-4 text-card-foreground shadow-[0_12px_40px_rgba(17,17,17,0.12)]"
        >
          {panel === "menu" ? (
            <div className="flex flex-col gap-3">
              <p className="px-0.5 text-[15px] font-medium leading-snug tracking-[-0.01em] text-foreground">
                Add a file from your device or select one from your library
              </p>
              <Button
                type="button"
                variant="secondary"
                className="h-11 w-full rounded-full bg-muted text-[15px] font-medium text-foreground hover:bg-muted/80"
                onClick={() => setPanel("library")}
              >
                <ImagePlusIcon data-icon="inline-start" className="size-4" strokeWidth={1.75} />
                Select Asset
              </Button>
              <Button
                type="button"
                className="h-11 w-full rounded-full bg-primary text-[15px] font-medium text-primary-foreground hover:bg-primary/90"
                onClick={startDeviceUpload}
              >
                <PlusIcon data-icon="inline-start" className="size-4" strokeWidth={2.25} />
                Upload
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[15px] font-medium tracking-[-0.01em] text-foreground">Select Asset</p>
              {library.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files in your library yet.</p>
              ) : (
                <ul className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
                  {library.map((item) => {
                    const src = attachmentPreviewUrl(item);
                    const selected = attachments.some((entry) => entry.id === item.id);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          className={cn(
                            "size-[72px] overflow-hidden rounded-[14px] bg-muted ring-offset-2",
                            selected && "ring-2 ring-foreground",
                          )}
                          onClick={() => toggleLibraryItem(item)}
                        >
                          {item.mimeType.startsWith("image/") && src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt={item.originalName} className="size-full object-cover" />
                          ) : (
                            <span className="line-clamp-3 px-1 text-[10px] text-muted-foreground">
                              {item.originalName}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button
                type="button"
                variant="ghost"
                className="h-8 self-start px-2 text-sm text-muted-foreground"
                onClick={() => setPanel("menu")}
              >
                Back
              </Button>
            </div>
          )}
        </div>,
        document.body,
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={(event) => void handleFiles(event.target.files)}
      />
    </div>
  );

  async function uploadWithUppy(
    file: File,
    signed: { params: string; signature: string },
    onProgress: (percent: number) => void,
  ): Promise<{ assemblyId: string; resultUrl: string; assemblyStatus: string }> {
    const [{ default: Uppy }, { default: Transloadit }] = await Promise.all([
      import("@uppy/core"),
      import("@uppy/transloadit"),
    ]);
    const uppy = new Uppy({
      autoProceed: true,
      restrictions: { maxNumberOfFiles: 1, maxFileSize: Math.floor(0.5 * 1024 * 1024 * 1024) },
    });
    uppy.use(Transloadit, {
      assemblyOptions: {
        params: signed.params,
        signature: signed.signature,
      },
      waitForEncoding: true,
    });
    uppyRef.current = uppy;
    let last = -1;
    const report = (percent: number) => {
      const next = Math.min(99, Math.max(0, Math.round(percent)));
      if (next === last) return;
      last = next;
      onProgress(next);
    };
    uppy.on("upload-progress", (_current, progress) => {
      if (typeof progress.percentage === "number") {
        report(progress.percentage * 0.9);
        return;
      }
      const total = progress.bytesTotal || file.size;
      if (total) report((progress.bytesUploaded / total) * 90);
    });
    uppy.on("postprocess-progress", (_current, progress) => {
      if (progress.mode === "determinate" && typeof progress.value === "number") {
        const part = progress.value > 1 ? progress.value / 100 : progress.value;
        report(90 + part * 9);
      }
    });
    uppy.addFile({ name: file.name, type: file.type, data: file });
    const result = await uppy.upload();
    uppyRef.current = null;
    if (result?.failed?.length) {
      throw new Error(result.failed[0]?.error ?? "Upload failed");
    }
    onProgress(100);
    const assembly = (result as { transloadit?: AssemblyResult[] } | undefined)?.transloadit?.[0];
    const assemblyId = assembly?.assembly_id;
    const resultUrl = extractResultUrl(assembly);
    if (!assemblyId || !resultUrl) {
      throw new Error("Transloadit did not return a completed assembly URL");
    }
    return { assemblyId, resultUrl, assemblyStatus: "completed" };
  }
}

function makePendingAttachment(file: File, sortOrder: number): ComposerAttachment {
  return {
    id: `pending:${crypto.randomUUID()}`,
    mimeType: file.type,
    originalName: file.name,
    resultUrl: URL.createObjectURL(file),
    durableUrl: null,
    sortOrder,
    uploadProgress: 0,
  };
}

function revokePreview(item: Attachment) {
  if (item.resultUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(item.resultUrl);
  }
}

function extractResultUrl(assembly: AssemblyResult | undefined): string | undefined {
  if (!assembly) return undefined;
  const fromUploads = assembly.uploads?.[0]?.ssl_url ?? assembly.uploads?.[0]?.url;
  if (fromUploads) return fromUploads;
  for (const group of Object.values(assembly.results ?? {})) {
    const url = group?.[0]?.ssl_url ?? group?.[0]?.url;
    if (url) return url;
  }
  return undefined;
}
