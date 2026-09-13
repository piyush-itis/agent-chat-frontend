import type { ContentBlock } from "@/generated/api";
import { formatMagicaCredits } from "@/lib/format-magica-credits";

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
  const creditUsed = typeof output.creditUsed === "number" ? output.creditUsed : null;

  return (
    <section className="my-3 rounded-2xl border border-border bg-secondary/60 p-3">
      <div className="flex items-center justify-between gap-2 text-[12px]">
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
        <img src={imageUrl} alt="Generated" className="mt-3 max-h-80 rounded-2xl" />
      ) : null}
      {videoUrl ? (
        <video src={videoUrl} controls className="mt-3 max-h-80 w-full rounded-2xl" />
      ) : null}
      {creditUsed !== null && creditUsed > 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{formatMagicaCredits(creditUsed)}</p>
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
