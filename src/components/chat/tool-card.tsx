import type { ContentBlock } from "@/generated/api";

export function ToolCard({
  use,
  result,
}: {
  use: Extract<ContentBlock, { type: "tool_use" }>;
  result?: Extract<ContentBlock, { type: "tool_result" }>;
}) {
  const status = result?.status ?? "pending";
  const output = (result?.output ?? {}) as Record<string, unknown>;
  const imageUrl = typeof output.image_url === "string" ? output.image_url : null;
  const videoUrl = typeof output.video_url === "string" ? output.video_url : null;
  const creditCost = typeof output.creditCost === "number" ? output.creditCost : null;

  return (
    <section className="my-3 rounded-xl border border-border bg-secondary/40 p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <p className="font-medium">{labelFor(use.toolName)}</p>
        <p className="text-muted-foreground">{statusLabel(status)}</p>
      </div>
      <pre className="mt-2 max-h-24 overflow-auto text-[11px] text-muted-foreground">
        {JSON.stringify(use.input, null, 2)}
      </pre>
      {result?.status === "failed" ? (
        <p className="mt-2 text-sm text-destructive">{String(output.error ?? "Tool failed")}</p>
      ) : null}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="Generated" className="mt-3 max-h-80 rounded-lg" />
      ) : null}
      {videoUrl ? (
        <video src={videoUrl} controls className="mt-3 max-h-80 w-full rounded-lg" />
      ) : null}
      {creditCost !== null ? (
        <p className="mt-2 text-xs text-muted-foreground">{creditCost} credits</p>
      ) : null}
    </section>
  );
}

function labelFor(name: string) {
  if (name === "gpt_image_2") return "GPT Image 2";
  if (name === "crop_image") return "Crop Image";
  if (name === "merge_videos") return "Merge Videos";
  if (name === "load_skill") return "Load skill";
  if (name === "read_skill_asset") return "Read skill asset";
  return name;
}

function statusLabel(status: string) {
  if (status === "success") return "completed";
  if (status === "pending") return "running";
  return status;
}
