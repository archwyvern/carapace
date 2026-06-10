import { useEffect, useRef } from "react";

export interface OutputLine {
  id: string | number;
  text: string;
  level?: "info" | "warn" | "error";
}

export interface OutputPanelProps {
  lines: OutputLine[];
  /** Auto-scroll to the newest line. Default true. */
  follow?: boolean;
  ariaLabel?: string;
  className?: string;
}

const LEVEL_CLASS: Record<NonNullable<OutputLine["level"]>, string> = {
  info: "text-fg",
  warn: "text-warning",
  error: "text-error",
};

/** A scrollable, tailing log/output panel. */
export function OutputPanel({ lines, follow = true, ariaLabel = "Output", className }: OutputPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (follow && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines.length, follow]);

  return (
    <div
      ref={ref}
      role="log"
      aria-label={ariaLabel}
      className={`min-h-0 overflow-auto bg-surface-sunken p-2 font-mono text-sm ${className ?? ""}`}
    >
      {lines.map((line) => (
        <div key={line.id} className={`whitespace-pre-wrap ${LEVEL_CLASS[line.level ?? "info"]}`}>
          {line.text}
        </div>
      ))}
    </div>
  );
}
