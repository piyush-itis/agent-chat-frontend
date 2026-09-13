export function MagicaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="18" r="9" fill="#6D5EF7" />
      <circle cx="12.2" cy="10" r="2.15" fill="#6D5EF7" />
      <circle cx="19.8" cy="10" r="2.15" fill="#6D5EF7" />
    </svg>
  );
}

export function MagicaHeaderMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <circle cx="10.4" cy="5.6" r="2.15" fill="var(--background)" />
    </svg>
  );
}

export function MagicaWordmark() {
  return (
    <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
      <MagicaMark className="size-5" />
      Magica
    </span>
  );
}
