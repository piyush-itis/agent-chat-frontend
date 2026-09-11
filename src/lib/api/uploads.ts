import { apiFetch } from "./client";
import type { Attachment } from "@/generated/api";

export function signUpload(input: { mimeType: string; byteSize: number; originalName: string }) {
  return apiFetch<{ params: string; signature: string; expires: string }>("/api/uploads/signature", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function completeUpload(input: {
  chatId?: string;
  assemblyId: string;
  mimeType: string;
  byteSize: number;
  originalName: string;
  resultUrl?: string;
  sortOrder?: number;
}) {
  return apiFetch<Attachment>("/api/uploads/complete", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
