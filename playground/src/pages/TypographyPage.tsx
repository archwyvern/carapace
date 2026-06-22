import { useEffect, useRef, useState } from "react";
import { Badge, Button } from "@carapace/shell";

// Measures the live computed font-size so px reflects the real theme tokens.
function ScaleRow({ cls, role, standard }: { cls: string; role: string; standard?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [px, setPx] = useState("");
  useEffect(() => {
    if (ref.current) setPx(getComputedStyle(ref.current).fontSize);
  }, []);
  return (
    <div
      className={`flex items-baseline gap-4 border-b border-border py-2 ${standard ? "bg-accent/10 px-2" : "px-2"}`}
    >
      <code className="w-24 shrink-0 text-base text-fg-mid">{cls}</code>
      <span className="w-14 shrink-0 tabular-nums text-base text-fg-mid">{px}</span>
      <span ref={ref} className={`${cls} text-fg`}>The quick brown fox jumps over the lazy dog</span>
      <span className="ml-auto shrink-0 text-base text-fg-mid">
        {role}
        {standard ? " · STANDARD" : ""}
      </span>
    </div>
  );
}

// A realistic slice of UI on the new scale: text-base (13) body, text-2xs chips,
// text-lg heading, text-md emphasis label.
function SampleUI() {
  return (
    <div className="flex w-[340px] flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-fg">Inspector</span>
        <Badge tone="accent">draft</Badge>
      </div>
      <div className="text-md text-fg-mid">Transform</div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center justify-between text-base">
          <span className="text-fg-mid">Width</span>
          <input
            readOnly
            value="1024"
            className="h-[24px] w-24 rounded-control border border-border bg-surface-sunken px-2 text-right text-base text-fg"
          />
        </label>
        <label className="flex items-center justify-between text-base">
          <span className="text-fg-mid">Blend mode</span>
          <span className="text-fg">Normal</span>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="accent">Apply</Button>
        <Button>Cancel</Button>
        <span className="ml-auto text-2xs text-fg-mid">v2 · edited 3m ago</span>
      </div>
    </div>
  );
}

export function TypographyPage() {
  return (
    <div className="h-full overflow-auto p-6 text-fg">
      <h1 className="mb-1 text-lg font-semibold">Typography</h1>
      <p className="mb-5 max-w-2xl text-base text-fg-mid">
        <code>text-base</code> = <strong>13px</strong> is the standard body size — the workhorse the
        shell components use (89 call sites). Smaller sizes step down for secondary text; the 10px
        <code> text-2xs</code> chip size is the one sanctioned exception. 13px lines up with a
        code-editor default (JetBrains Mono / the Godot UI stack carapace is modelled on).
      </p>

      <div className="mb-8 max-w-4xl">
        <ScaleRow cls="text-2xs" role="chips / badges (exception)" />
        <ScaleRow cls="text-xs" role="small / caption" />
        <ScaleRow cls="text-sm" role="secondary" />
        <ScaleRow cls="text-base" role="body" standard />
        <ScaleRow cls="text-md" role="emphasis labels" />
        <ScaleRow cls="text-lg" role="headings" />
      </div>

      <h2 className="mb-3 text-md font-medium text-fg-mid">In context</h2>
      <SampleUI />
    </div>
  );
}
