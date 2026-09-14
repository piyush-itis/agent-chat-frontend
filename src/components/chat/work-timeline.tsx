"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon, CircleCheckIcon, FileTextIcon, KeyRoundIcon, SparklesIcon, ZapIcon } from "lucide-react";
import type { ContentBlock, GeneratedAsset, Waitpoint } from "@/generated/api";
import { cn } from "@/lib/utils";

export type InspectorTarget = {
  title: string;
  fields: { label: string; value: string }[];
  asset?: GeneratedAsset;
};

const HIDDEN_STEPS = new Set(["get_pricing"]);

export function WorkTimeline({
  blocks,
  waitpoint,
  live,
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
  const pending = steps.some((step) => step.status === "pending");
  const finished = !live && !pending;

  useEffect(() => {
    setCollapsed(!live);
  }, [live]);

  if (steps.length === 0) return null;

  const header = finished
    ? `Completed ${steps.length} step${steps.length === 1 ? "" : "s"}`
    : `Working · ${steps.length} step${steps.length === 1 ? "" : "s"}`;

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
        className="mb-2 flex items-center gap-1.5 text-[13px] text-muted-foreground"
        onClick={() => setCollapsed((value) => !value)}
      >
        {header}
        <ChevronDownIcon className={cn("size-3.5 transition-transform", collapsed && "-rotate-90")} />
      </button>
      {collapsed ? null : (
        <div className="flex flex-col">
          {steps.map((step) => (
            <StepRow key={step.id} step={step} live={live} />
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

function StepRow({ step, live }: { step: TimelineStep; live?: boolean }) {
  const running = step.status === "pending";
  const meta = stepMeta(step.toolName, step.status, Boolean(live && running));
  const fields = fieldsFor(step);
  const duration = durationLabel(step.output);
  const canExpand = meta.expandable && fields.length > 0;
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
        <span className={cn("flex size-5 shrink-0 items-center justify-center", meta.iconClass)}>{meta.icon}</span>
        <span className="text-[14px] leading-5 text-foreground">{meta.label}</span>
        {running ? (
          <span
            className="size-3.5 shrink-0 animate-spin rounded-full border border-muted-foreground/30 border-t-muted-foreground"
            aria-hidden
          />
        ) : (
          <>
            <CircleCheckIcon className="size-3.5 shrink-0 text-[#22c55e]" strokeWidth={2} />
            {duration ? <span className="text-[13px] text-muted-foreground">{duration}</span> : null}
          </>
        )}
        {canExpand ? (
          <ChevronDownIcon
            className={cn("ml-auto size-3.5 shrink-0 text-muted-foreground", !open && "-rotate-90")}
          />
        ) : null}
      </button>
      {open && canExpand ? (
        <div className="mb-3 min-w-0 overflow-hidden rounded-2xl border border-border px-4 py-3">
          {fields.map((field) => (
            <div key={field.label} className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 py-1.5 text-[13px] leading-6">
              <p className="text-muted-foreground">{field.label}</p>
              <p className="min-w-0 break-words text-foreground">{field.value}</p>
            </div>
          ))}
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
    if (HIDDEN_STEPS.has(block.toolName)) continue;
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
      icon: <ZapIcon className="size-3.5" strokeWidth={2} />,
      iconClass: "text-[#e8a017]",
      defaultOpen: false,
      expandable: false,
    };
  }
  if (toolName === "ask_questions") {
    return {
      label: status === "success" ? "User input received" : "Asking questions",
      icon: <FileTextIcon className="size-3.5" />,
      iconClass: "text-muted-foreground",
      defaultOpen: livePending || status !== "success",
      expandable: true,
    };
  }
  if (toolName === "model_schema") {
    return {
      label: "Model schema",
      icon: <KeyRoundIcon className="size-3.5" />,
      iconClass: "text-muted-foreground",
      defaultOpen: false,
      expandable: true,
    };
  }
  if (toolName === "gpt_image_2") {
    return {
      label: "AI Generation",
      icon: <SparklesIcon className="size-3.5" />,
      iconClass: "text-foreground",
      defaultOpen: true,
      expandable: true,
    };
  }
  if (toolName === "crop_image") {
    return {
      label: "Crop Image",
      icon: <SparklesIcon className="size-3.5" />,
      iconClass: "text-foreground",
      defaultOpen: true,
      expandable: true,
    };
  }
  if (toolName === "merge_videos") {
    return {
      label: "Merge Videos",
      icon: <SparklesIcon className="size-3.5" />,
      iconClass: "text-foreground",
      defaultOpen: true,
      expandable: true,
    };
  }
  return {
    label: toolName,
    icon: <SparklesIcon className="size-3.5" />,
    iconClass: "text-muted-foreground",
    defaultOpen: false,
    expandable: false,
  };
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
      { label: "Model", value: String(output.model ?? input.model ?? "gpt-image-2-text") },
      { label: "Prompt", value: String(input.prompt ?? output.prompt ?? "") },
      { label: "Size", value: formatSize(String(output.size ?? input.size ?? "1024x1024")) },
      { label: "Quality", value: titleCase(String(output.quality ?? input.quality ?? "High")) },
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
  return [];
}

export function durationLabel(output: unknown) {
  const ms = asRecord(output).durationMs;
  if (typeof ms !== "number" || ms < 0) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatSize(value: string) {
  return value.replace(/\s*x\s*/i, "×");
}

function titleCase(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
