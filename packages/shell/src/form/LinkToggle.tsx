import { LinkIcon, UnlinkIcon } from "../icons";

/** Chain toggle for aspect-ratio locking a group of numeric fields. `column` draws the bracket that
 *  visually ties stacked rows together; omit it for a row arrangement. Self-stretches so the bracket
 *  spans whatever height its container gives it. */
export function LinkToggle({ linked, onToggle, column = false }: { linked: boolean; onToggle: () => void; column?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={linked}
      aria-label={linked ? "Unlock aspect ratio" : "Lock aspect ratio"}
      title={linked ? "Aspect ratio locked — click to unlink" : "Lock aspect ratio"}
      className={`relative flex w-5 shrink-0 items-center justify-center self-stretch rounded-control hover:text-fg ${linked ? "text-accent" : "text-fg-mid"}`}
    >
      {column && (
        <span className={`pointer-events-none absolute left-0 top-[18%] bottom-[18%] w-1.5 rounded-r-sm border-y border-r ${linked ? "border-accent/60" : "border-border"}`} />
      )}
      {linked ? <LinkIcon className="h-3.5 w-3.5" /> : <UnlinkIcon className="h-3.5 w-3.5" />}
    </button>
  );
}
