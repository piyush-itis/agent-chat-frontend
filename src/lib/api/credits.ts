import type { CreditsResponse } from "@/generated/api";
import { apiFetch } from "./client";

export function getCredits() {
  return apiFetch<CreditsResponse>("/api/me/credits");
}
