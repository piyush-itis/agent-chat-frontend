"use client";

import { useEffect, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  CircleDollarSignIcon,
  FileTextIcon,
  KeyRoundIcon,
  SparklesIcon,
  WandSparklesIcon,
} from "lucide-react";
import type { ContentBlock, GeneratedAsset, Waitpoint } from "@/generated/api";
import { formatMagicaCredits } from "@/lib/format-magica-credits";
import { assetFromUrl, urlsFromToolOutput } from "@/lib/generated-media";
import { cn } from "@/lib/utils";
import { ActivityDots } from "./run-activity";

export type InspectorTarget = {
  title: string;
  fields: { label: string; value: string }[];
  asset?: GeneratedAsset;
};

export function WorkTimeline({
  blocks,
  waitpoint,
  assets,
  live,
  onInspect,
}: {
  blocks: ContentBlock[];
  waitpoint?: Waitpoint | null;
  assets?: GeneratedAsset[];
  live?: boolean;
  onInspect?: (target: InspectorTarget) => void;
}) {
  const [collapsed, setCollapsed] = useState(!live);
  const steps = collectSteps(blocks, waitpoint);
  const answers = latestAnswers(steps);
  const pending = Boolean(live && steps.some((step) => step.status === "pending"));

  useEffect(() => {
    if (!live) setCollapsed(true);
  }, [live]);

  if (steps.length === 0) return null;

  return (
    <div className="min-w-0 w-full">
      {answers.length > 0 ? (
        <div className="mb-5 space-y-2 text-[13px] text-muted-foreground">
          {answers
            .filter((item) => item.answer)
            .map((item) => (
              <p key={item.id}>
                <span className="text-foreground">
                  {item.id}
                  {item.required ? "*" : ""}
                </span>
                <span className="mx-3">{item.prompt}</span>
                <span>→ {item.answer}</span>
              </p>
            ))}
        </div>
      ) : null}
      <button
        type="button"
        className="mb-3 flex items-center gap-2 text-[13px] text-muted-foreground"
        onClick={() => setCollapsed((value) => !value)}
      >
        {pending ? <ActivityDots /> : null}
        Working · {steps.length} step{steps.length === 1 ? "" : "s"}
        <ChevronDownIcon className={cn("size-3.5 transition-transform", collapsed && "-rotate-90")} />
      </button>
      {collapsed ? null : (
        <div className="flex flex-col gap-1">
          {steps.map((step) => (
            <StepRow key={step.id} step={step} assets={assets} live={live} onInspect={onInspect} />
          ))}
        </div>
      )}
    </div>
  );
}

type TimelineStep = {
  id: string;
  toolName: string;
  input: unknown;
  output?: unknown;
  status: "pending" | "success" | "failed";
};

function StepRow({
  step,
  assets,
  live,
  onInspect,
}: {
  step: TimelineStep;
  assets?: GeneratedAsset[];
  live?: boolean;
  onInspect?: (target: InspectorTarget) => void;
}) {
  const running = step.status === "pending";
  const meta = stepMeta(step.toolName, step.status, Boolean(live && running));
  const fields = fieldsFor(step);
  const duration = durationLabel(step.output);
  const credit = creditLabel(step);
  const media = imageFrom(step, assets);
  const canExpand = fields.length > 0 || Boolean(media);
  const [open, setOpen] = useState(Boolean(live) && meta.defaultOpen);

  useEffect(() => {
    if (!live) setOpen(false);
  }, [live]);

  return (
    <section>
      <button
        type="button"
        className="flex w-full items-center gap-2 py-1.5 text-left"
        onClick={() => {
          if (canExpand) setOpen((value) => !value);
        }}
      >
        <span className={cn("flex size-5 items-center justify-center", meta.iconClass)}>{meta.icon}</span>
        <span className="text-[14px] text-foreground">{meta.label}</span>
        <span className="ml-auto flex items-center gap-2 text-[12px] text-muted-foreground">
          {credit ? <span>{credit}</span> : null}
          {running ? (
            <span className="size-3.5 animate-spin rounded-full border border-border border-t-muted-foreground" />
          ) : (
            <>
              <span className="flex size-3.5 items-center justify-center rounded-full bg-[#22c55e] text-white">
                <CheckIcon className="size-2.5" strokeWidth={3} />
              </span>
              {duration ? <span>{duration}</span> : null}
            </>
          )}
          {canExpand ? (
            <ChevronDownIcon className={cn("size-3.5 text-muted-foreground", !open && "-rotate-90")} />
          ) : null}
        </span>
      </button>
      {open && canExpand ? (
        <div className="mb-3 ml-7 min-w-0 overflow-hidden rounded-xl border border-border px-4 py-3">
          {fields.map((field) => (
            <div key={field.label} className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 py-1.5 text-[13px]">
              <p className="text-muted-foreground">{field.label}</p>
              <p className="min-w-0 break-words text-foreground">{field.value}</p>
            </div>
          ))}
          {media ? <StepMedia asset={media} /> : null}
          {meta.inspectable ? (
            <button
              type="button"
              className="mt-1 text-[13px] text-[#2563eb]"
              onClick={() =>
                onInspect?.({
                  title: meta.label,
                  fields: inspectFields(step),
                  asset: media,
                })
              }
            >
              View more
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function collectSteps(blocks: ContentBlock[], waitpoint?: Waitpoint | null): TimelineStep[] {
  const results = new Map<string, Extract<ContentBlock, { type: "tool_result" }>>();
  for (const block of blocks) {
    if (block.type === "tool_result") results.set(block.invocationId, block);
  }
  const steps: TimelineStep[] = [];
  for (const block of blocks) {
    if (block.type !== "tool_use") continue;
    const result = results.get(block.invocationId);
    const input =
      block.toolName === "ask_questions" && waitpoint?.payload.questions?.length
        ? { message: waitpoint.payload.message ?? asRecord(block.input).message, questions: waitpoint.payload.questions }
        : block.input;
    steps.push({
      id: block.invocationId,
      toolName: block.toolName,
      input,
      output: result?.output,
      status: result ? (result.status === "failed" ? "failed" : "success") : "pending",
    });
  }
  if (waitpoint?.kind === "questions" && waitpoint.status === "open") {
    const exists = steps.some((step) => step.toolName === "ask_questions" && step.status === "pending");
    if (!exists) {
      steps.push({
        id: waitpoint.id,
        toolName: "ask_questions",
        input: { message: waitpoint.payload.message, questions: waitpoint.payload.questions },
        status: "pending",
      });
    }
  }
  return steps;
}

function latestAnswers(steps: TimelineStep[]) {
  const asked = [...steps].reverse().find((step) => step.toolName === "ask_questions");
  if (!asked) return [];
  const input = asRecord(asked.input);
  const output = asRecord(asked.output);
  const answers = asRecord(output.answers);
  const questions = Array.isArray(input.questions) ? input.questions : [];
  return questions.map((item, index) => {
    const record = asRecord(item);
    const id = typeof record.id === "string" ? record.id : `Q${index + 1}`;
    return {
      id,
      prompt: String(record.prompt ?? ""),
      required: Boolean(record.required),
      answer: String(answers[id] ?? record.answer ?? ""),
    };
  });
}

function stepMeta(toolName: string, status: TimelineStep["status"], livePending: boolean) {
  if (toolName === "load_skill" || toolName === "read_skill_asset") {
    return {
      label: "Skill",
      icon: <WandSparklesIcon className="size-3.5" />,
      iconClass: "text-[#d97706]",
      defaultOpen: false,
      inspectable: false,
    };
  }
  if (toolName === "ask_questions") {
    return {
      label: status === "success" ? "User input received" : "Asking questions",
      icon: <FileTextIcon className="size-3.5" />,
      iconClass: "text-muted-foreground",
      defaultOpen: livePending || status !== "success",
      inspectable: false,
    };
  }
  if (toolName === "model_schema") {
    return {
      label: "Model schema",
      icon: <KeyRoundIcon className="size-3.5" />,
      iconClass: "text-muted-foreground",
      defaultOpen: false,
      inspectable: true,
    };
  }
  if (toolName === "get_pricing") {
    return {
      label: "Get Pricing",
      icon: <CircleDollarSignIcon className="size-3.5" />,
      iconClass: "text-muted-foreground",
      defaultOpen: false,
      inspectable: false,
    };
  }
  if (toolName === "gpt_image_2") {
    return {
      label: "AI Generation",
      icon: <SparklesIcon className="size-3.5" />,
      iconClass: "text-foreground",
      defaultOpen: true,
      inspectable: true,
    };
  }
  if (toolName === "crop_image") {
    return { label: "Crop Image", icon: <SparklesIcon className="size-3.5" />, iconClass: "text-foreground", defaultOpen: true, inspectable: true };
  }
  if (toolName === "merge_videos") {
    return { label: "Merge Videos", icon: <SparklesIcon className="size-3.5" />, iconClass: "text-foreground", defaultOpen: true, inspectable: true };
  }
  return { label: toolName, icon: <SparklesIcon className="size-3.5" />, iconClass: "text-muted-foreground", defaultOpen: false, inspectable: false };
}

function fieldsFor(step: TimelineStep) {
  const input = asRecord(step.input);
  const output = asRecord(step.output);
  if (step.toolName === "ask_questions") {
    const questions = Array.isArray(input.questions) ? input.questions : [];
    const answers = asRecord(output.answers);
    const rows = [
      { label: "Message", value: String(input.message ?? output.message ?? "") },
      ...questions.map((item, index) => {
        const record = asRecord(item);
        const id = typeof record.id === "string" ? record.id : `Q${index + 1}`;
        const answer = String(answers[id] ?? record.answer ?? "");
        const star = record.required ? "*" : "";
        return {
          label: `${id}${star}`,
          value: answer ? `${record.prompt} → ${answer}` : String(record.prompt ?? ""),
        };
      }),
    ];
    return rows.filter((row) => row.value);
  }
  if (step.toolName === "model_schema") {
    return [{ label: "Model ID", value: String(input.modelId ?? output.modelId ?? "") }].filter((row) => row.value);
  }
  if (step.toolName === "gpt_image_2") {
    return [
      { label: "Tool", value: "generate" },
      { label: "Model", value: String(output.model ?? "gpt-image-2-text") },
      { label: "Prompt", value: String(input.prompt ?? output.prompt ?? "") },
      { label: "Size", value: String(output.size ?? input.size ?? "1024x1024") },
      { label: "Quality", value: String(output.quality ?? input.quality ?? "High") },
    ].filter((row) => row.value);
  }
  if (step.toolName === "crop_image") {
    const crop = asRecord(input.crop);
    const x = crop.x ?? input.x;
    const y = crop.y ?? input.y;
    const width = crop.width ?? input.width;
    const height = crop.height ?? input.height;
    const unit = typeof (crop.unit ?? input.unit) === "string" ? String(crop.unit ?? input.unit) : "";
    const cropLabel =
      [x, y, width, height].every((value) => value !== undefined && value !== "")
        ? `${x}, ${y} · ${width} × ${height}${unit ? ` ${unit}` : ""}`
        : "";
    return [{ label: "Crop", value: cropLabel }].filter((row) => row.value);
  }
  if (step.toolName === "merge_videos") {
    const urls = Array.isArray(input.video_urls) ? input.video_urls.filter((item) => typeof item === "string") : [];
    return [
      { label: "Videos", value: urls.length ? `${urls.length} video${urls.length === 1 ? "" : "s"}` : "" },
      { label: "Transition", value: String(input.transition ?? "none") },
    ].filter((row) => row.value);
  }
  if (step.toolName === "load_skill") {
    return [{ label: "Skill", value: String(input.name ?? "") }].filter((row) => row.value);
  }
  return [];
}

function inspectFields(step: TimelineStep) {
  const base = fieldsFor(step);
  const output = asRecord(step.output);
  if (step.toolName !== "gpt_image_2") return base;
  return [
    ...base,
    { label: "Output Format", value: String(output.output_format ?? "PNG") },
    { label: "Background", value: String(output.background ?? "Opaque") },
    { label: "Number of Images", value: "1" },
  ];
}

function durationLabel(output: unknown) {
  const ms = asRecord(output).durationMs;
  if (typeof ms !== "number" || ms < 0) return "";
  return `${(ms / 1000).toFixed(1)}s`;
}

function creditLabel(step: TimelineStep) {
  const output = asRecord(step.output);
  if (typeof output.creditUsed === "number" && output.creditUsed > 0) {
    return formatMagicaCredits(output.creditUsed);
  }
  if (typeof output.estimateCredits === "number" && output.estimateCredits > 0) {
    return formatMagicaCredits(output.estimateCredits);
  }
  return "";
}

function StepMedia({ asset }: { asset: GeneratedAsset }) {
  const src = asset.durableUrl ?? asset.url;
  if (asset.kind === "video") {
    return <video src={src} controls className="mt-3 w-full rounded-xl" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Generated" referrerPolicy="no-referrer" className="mt-3 w-full rounded-xl bg-muted" />
  );
}

function imageFrom(step: TimelineStep, assets?: GeneratedAsset[]) {
  const outputUrl = urlsFromToolOutput(step.output)[0];
  const inputUrl = asRecord(step.input).image_url;
  const fallback = typeof inputUrl === "string" && /^https?:\/\//.test(inputUrl) ? inputUrl : undefined;
  const url = outputUrl ?? fallback;
  if (!url) return undefined;
  return assetFromUrl(step.id, url, assets);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
