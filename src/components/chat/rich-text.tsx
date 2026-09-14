import type { ReactNode } from "react";

const IMAGE_MD = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
const BARE_MEDIA = /^(https?:\/\/\S+\.(?:png|jpe?g|gif|webp|avif|mp4|webm)(?:\?\S*)?)$/i;

export function extractMarkdownImages(text: string): string[] {
  return [...text.matchAll(new RegExp(IMAGE_MD.source, "g"))].map((match) => match[2]);
}

export function stripMarkdownMedia(text: string, urls?: Set<string>): string {
  if (!urls || urls.size === 0) return text;
  const withoutEmbeds = text.replace(new RegExp(IMAGE_MD.source, "g"), (match, _alt, src) =>
    urls.has(src) ? "" : match,
  );
  return withoutEmbeds
    .split("\n")
    .filter((line) => !urls.has(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function RichText({
  text,
  resolveSrc,
}: {
  text: string;
  resolveSrc?: (url: string) => string;
}) {
  return <div className="space-y-3">{tokenize(text).map((token, index) => renderToken(token, index, resolveSrc))}</div>;
}

type Token =
  | { type: "text"; value: string }
  | { type: "image"; src: string; alt: string }
  | { type: "video"; src: string };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const matcher = new RegExp(IMAGE_MD.source, "g");
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(text))) {
    if (match.index > last) tokens.push(...splitBareMedia(text.slice(last, match.index)));
    tokens.push(mediaToken(match[2], match[1]));
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push(...splitBareMedia(text.slice(last)));
  return tokens;
}

function splitBareMedia(text: string): Token[] {
  const tokens: Token[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const value = buffer.join("\n");
    if (value.trim()) tokens.push({ type: "text", value });
    buffer = [];
  };
  for (const line of text.split("\n")) {
    if (BARE_MEDIA.test(line.trim())) {
      flush();
      tokens.push(mediaToken(line.trim()));
    } else {
      buffer.push(line);
    }
  }
  flush();
  return tokens;
}

function mediaToken(src: string, alt = ""): Token {
  return isVideoUrl(src) ? { type: "video", src } : { type: "image", src, alt };
}

function isVideoUrl(src: string) {
  return /\.(mp4|webm)(?:\?|$)/i.test(src);
}

function renderToken(token: Token, index: number, resolveSrc?: (url: string) => string) {
  if (token.type === "image") {
    const src = resolveSrc?.(token.src) ?? token.src;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={`${src}-${index}`}
        src={src}
        alt={token.alt || "Generated image"}
        className="my-1 w-full max-w-[520px] rounded-2xl bg-muted"
      />
    );
  }
  if (token.type === "video") {
    const src = resolveSrc?.(token.src) ?? token.src;
    return <video key={`${src}-${index}`} src={src} controls className="my-1 w-full max-w-[520px] rounded-2xl" />;
  }
  return <MarkdownChunk key={`t-${index}`} text={token.value} />;
}

function MarkdownChunk({ text }: { text: string }) {
  const lines = text.replace(/^\n+|\n+$/g, "").split("\n");
  const nodes: ReactNode[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (list.length === 0) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="list-disc space-y-1 pl-5 text-[15px] leading-7 text-foreground">
        {list.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const line of lines) {
    const bullet = line.match(/^\s*[-*]\s+(.+)/);
    if (bullet?.[1]) {
      list.push(bullet[1]);
      continue;
    }
    flushList();
    if (!line.trim()) continue;
    nodes.push(
      <p key={`p-${nodes.length}`} className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">
        {renderInline(line)}
      </p>,
    );
  }
  flushList();
  return <>{nodes}</>;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const matcher = new RegExp(INLINE.source, "g");
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = matcher.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[0].startsWith("**")) {
      nodes.push(
        <strong key={`b-${index}`} className="font-medium">
          {match[1]}
        </strong>,
      );
    } else {
      nodes.push(
        <a
          key={`a-${index}`}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="text-[#2563eb] underline-offset-2 hover:underline"
        >
          {match[2]}
        </a>,
      );
    }
    last = match.index + match[0].length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
