import { useMemo, useRef, useState } from "react";
import { cx } from "../cx";
import { TextInput } from "../primitives/TextInput";
import { IconButton } from "../primitives/IconButton";
import { CloseIcon, EditIcon, ResetIcon, WarningIcon } from "../icons";
import { chordFromEvent, formatKeys } from "./keybinding";

export interface ShortcutRow {
  id: string;
  /** Display name, e.g. "File: Save". */
  command: string;
  /** Effective chord ("Ctrl+S"), or null when unbound. */
  keys: string | null;
  /** Scope label shown in the When column (e.g. "editor"). Empty = global. */
  when?: string;
  source: "default" | "user";
  /** Informational mouse gesture ("Middle-drag") — shown in the binding column, not recordable. */
  mouse?: string;
}

export interface ShortcutEditorProps {
  rows: ShortcutRow[];
  /** Rebind (keys chord) or unbind (null). */
  onChange: (id: string, keys: string | null) => void;
  /** Drop the user override, restoring the default binding. */
  onReset: (id: string) => void;
}

function Kbd({ keys }: { keys: string }) {
  return (
    <span className="inline-block border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-sm text-fg">
      {formatKeys(keys)}
    </span>
  );
}

/**
 * VS Code-style keyboard-shortcut editor table: Command / Keybinding / When / Source, a filter
 * box, click-to-record rebinding (Enter accepts, Escape cancels), per-row unbind + reset, and
 * conflict highlighting when two commands in the same scope share a chord. Presentational — the
 * host owns the bindings store and persistence.
 */
export function ShortcutEditor({ rows, onChange, onReset }: ShortcutEditorProps) {
  const [query, setQuery] = useState("");
  const [recording, setRecording] = useState<{ id: string; chord: string | null } | null>(null);
  const recordRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.command} ${r.keys ?? ""} ${r.when ?? ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  // conflicts: same chord in the same scope (unbound rows can't conflict)
  const conflicts = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of rows) {
      if (!r.keys) continue;
      const key = `${r.when ?? ""}\0${r.keys}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return new Set(rows.filter((r) => r.keys && (seen.get(`${r.when ?? ""}\0${r.keys}`) ?? 0) > 1).map((r) => r.id));
  }, [rows]);

  const onRecordKey = (e: React.KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!recording) return;
    if (e.key === "Escape") {
      setRecording(null);
      return;
    }
    if (e.key === "Enter" && recording.chord) {
      onChange(recording.id, recording.chord);
      setRecording(null);
      return;
    }
    const chord = chordFromEvent(e.nativeEvent);
    if (chord) setRecording({ ...recording, chord });
  };

  return (
    <div>
      <div className="mb-2 max-w-sm">
        <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter commands…" aria-label="Filter commands" />
      </div>
      <table className="w-full border-collapse text-base">
        <thead>
          <tr className="border-b border-border text-left text-sm font-semibold uppercase tracking-wide text-fg-mid">
            <th className="py-1.5 pr-3 font-semibold">Command</th>
            <th className="py-1.5 pr-3 font-semibold">Keybinding</th>
            <th className="py-1.5 pr-3 font-semibold">When</th>
            <th className="py-1.5 pr-3 font-semibold">Source</th>
            <th className="w-20 py-1.5" />
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => {
            const isRecording = recording?.id === r.id;
            return (
              <tr key={r.id} className="group border-b border-border/60 hover:bg-hover">
                <td className="py-1 pr-3 text-fg">{r.command}</td>
                <td className="py-1 pr-3">
                  {isRecording ? (
                    <div
                      ref={recordRef}
                      tabIndex={0}
                      role="textbox"
                      aria-label={`Recording keybinding for ${r.command}`}
                      className="inline-flex min-w-56 items-center gap-2 border border-accent bg-surface-sunken px-2 py-0.5 outline-none"
                      onKeyDown={onRecordKey}
                      onBlur={() => setRecording(null)}
                    >
                      {recording.chord ? <Kbd keys={recording.chord} /> : null}
                      <span className="text-sm text-fg-mid">
                        {recording.chord ? "Enter to accept · Esc to cancel" : "Press the key combination…"}
                      </span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      {r.keys ? <Kbd keys={r.keys} /> : r.mouse ? <span className="text-fg-mid">{r.mouse}</span> : <span className="text-fg-mid">—</span>}
                      {conflicts.has(r.id) ? (
                        <span
                          role="img"
                          aria-label="Conflicts with another command in the same scope"
                          title="Conflicts with another command in the same scope"
                        >
                          <WarningIcon className="h-3.5 w-3.5 text-warning" />
                        </span>
                      ) : null}
                    </span>
                  )}
                </td>
                <td className="py-1 pr-3 text-fg-mid">{r.when ?? ""}</td>
                <td className={cx("py-1 pr-3", r.source === "user" ? "text-accent" : "text-fg-mid")}>{r.source}</td>
                <td className="py-1 text-right">
                  {r.mouse && !r.keys ? null : (
                    <span className="invisible inline-flex items-center gap-0.5 group-hover:visible">
                      <IconButton
                        label={`Change keybinding for ${r.command}`}
                        tooltip="Change keybinding"
                        size="sm"
                        icon={<EditIcon />}
                        onClick={() => {
                          setRecording({ id: r.id, chord: null });
                          setTimeout(() => recordRef.current?.focus(), 0);
                        }}
                      />
                      {r.keys ? (
                        <IconButton
                          label={`Remove keybinding for ${r.command}`}
                          tooltip="Remove keybinding"
                          size="sm"
                          icon={<CloseIcon />}
                          onClick={() => onChange(r.id, null)}
                        />
                      ) : null}
                      {r.source === "user" ? (
                        <IconButton
                          label={`Reset keybinding for ${r.command}`}
                          tooltip="Reset to default"
                          size="sm"
                          icon={<ResetIcon />}
                          onClick={() => onReset(r.id)}
                        />
                      ) : null}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          {visible.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-3 text-fg-mid">
                No commands match "{query}"
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
