"use client";

import { useRef, useState } from "react";
import { PaperclipIcon } from "lucide-react";
import { ApiClientError } from "@/lib/api/client";
import { completeUpload, signUpload } from "@/lib/api/uploads";
import type { Attachment } from "@/generated/api";

export function AttachButton({
  chatId,
  attachments,
  onChange,
}: {
  chatId?: string;
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const next = [...attachments];
      for (const [index, file] of [...files].entries()) {
        const signed = await signUpload({
          mimeType: file.type,
          byteSize: file.size,
          originalName: file.name,
        });
        const assemblyId = await uploadWithUppy(file, signed);
        const saved = await completeUpload({
          chatId,
          assemblyId,
          mimeType: file.type,
          byteSize: file.size,
          originalName: file.name,
          sortOrder: next.length + index,
        });
        next.push(saved);
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-label="Attach file"
        disabled={busy}
        className="mb-1 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary disabled:opacity-40"
        onClick={() => inputRef.current?.click()}
      >
        <PaperclipIcon className="size-4" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={(event) => void handleFiles(event.target.files)}
      />
      {busy ? <p className="text-[11px] text-muted-foreground">Uploading…</p> : null}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
      {attachments.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
          {attachments.map((item) => (
            <li key={item.id} className="rounded bg-secondary px-2 py-0.5 text-[11px]">
              {item.originalName}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

async function uploadWithUppy(
  file: File,
  signed: { params: string; signature: string },
): Promise<string> {
  const [{ default: Uppy }, { default: Transloadit }] = await Promise.all([
    import("@uppy/core"),
    import("@uppy/transloadit"),
  ]);
  const uppy = new Uppy({ autoProceed: true, restrictions: { maxNumberOfFiles: 1 } });
  uppy.use(Transloadit, {
    assemblyOptions: {
      params: JSON.parse(signed.params) as Record<string, unknown>,
      signature: signed.signature,
    },
  });
  uppy.addFile({ name: file.name, type: file.type, data: file });
  const result = await uppy.upload();
  const assembly = (
    result as { transloadit?: { assembly_id?: string }[] } | undefined
  )?.transloadit?.[0];
  const id = assembly?.assembly_id;
  if (!id) {
    throw new Error("Transloadit did not return an assembly id");
  }
  return id;
}
