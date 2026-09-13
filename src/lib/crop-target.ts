import type { WaitpointQuestion } from "@/generated/api";

export const CROP_TARGET_QUESTION = {
  prompt: "Choose a crop target",
  choices: [
    { id: "square", label: "Square (1:1)", description: "Centered square crop" },
    { id: "story", label: "Story / Reel (9:16)", description: "Vertical, for Instagram/TikTok/Reels stories" },
    { id: "portrait", label: "Portrait (4:5)", description: "Instagram feed portrait" },
    { id: "landscape", label: "Landscape (16:9)", description: "Widescreen crop" },
    { id: "custom", label: "Custom region or ratio", description: "I'll specify exact dimensions or area" },
  ],
} as const;

const CROP_HINT = /\b(crop|ratio|region)\b/i;
const CROP_LABELS = CROP_TARGET_QUESTION.choices.map((choice) => choice.label.toLowerCase());

export function isNarratedCropTargetList(text: string) {
  const lower = text.toLowerCase();
  if (!lower.includes("choose a crop target")) return false;
  return CROP_LABELS.filter((label) => lower.includes(label)).length >= 3;
}


export function withCropTargetPreset(message: string, questions: WaitpointQuestion[]): WaitpointQuestion[] {
  if (questions.length === 0) return questions;
  if (questions.some((question) => question.choices?.length)) return questions;
  const blob = [message, ...questions.map((question) => question.prompt)].join(" ");
  if (!CROP_HINT.test(blob)) return questions;
  return [
    {
      id: questions[0]?.id ?? "Q1",
      prompt: CROP_TARGET_QUESTION.prompt,
      required: true,
      choices: CROP_TARGET_QUESTION.choices.map((choice) => ({ ...choice })),
    },
  ];
}
