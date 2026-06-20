import { useEffect, useRef } from "react";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  syntaxHighlighting,
  HighlightStyle,
  indentOnInput,
  bracketMatching,
} from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { lintGutter, setDiagnostics } from "@codemirror/lint";
import { tags as t } from "@lezer/highlight";

export type { Diagnostic } from "@codemirror/lint";
import type { Diagnostic } from "@codemirror/lint";

// Syntax palette. Carapace defines no per-token code colours, so this is a small
// self-contained scheme tuned for the dark theme; structural colours reference the
// carapace tokens (--color-fg / -fg-mid / -error / -accent) so it tracks the theme.
const highlight = HighlightStyle.define([
  { tag: t.keyword, color: "#c792ea" },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "var(--color-fg)" },
  { tag: [t.function(t.variableName), t.labelName], color: "#82aaff" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#f78c6c" },
  { tag: [t.definition(t.name), t.separator], color: "var(--color-fg)" },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self], color: "#ffcb6b" },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.special(t.string)], color: "#89ddff" },
  { tag: [t.meta, t.comment], color: "var(--color-fg-mid)", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: [t.string, t.inserted], color: "#c3e88d" },
  { tag: t.invalid, color: "var(--color-error)" },
]);

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const theme = EditorView.theme(
  {
    "&": {
      color: "var(--color-fg)",
      backgroundColor: "var(--color-surface)",
      height: "100%",
      fontSize: "13px",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": { fontFamily: MONO, lineHeight: "1.6" },
    ".cm-content": { caretColor: "var(--color-accent)" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-accent)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "color-mix(in srgb, var(--color-accent) 28%, transparent)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-surface)",
      color: "var(--color-fg-mid)",
      border: "none",
    },
    ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--color-fg) 4%, transparent)" },
    ".cm-activeLineGutter": { backgroundColor: "color-mix(in srgb, var(--color-fg) 7%, transparent)" },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px 0 14px" },
    ".cm-foldPlaceholder": { backgroundColor: "var(--color-surface-raised)", border: "none", color: "var(--color-fg-mid)" },
  },
  { dark: true },
);

export interface CodeEditorProps {
  /** Document text. Controlled: external changes are reflected without losing cursor/history when possible. */
  value: string;
  /** Fired on every user edit with the full document. */
  onChange?: (value: string) => void;
  /** Language for syntax highlighting. Read once at mount. */
  language?: "javascript" | "json";
  /** Disable editing. Reconfigured live. */
  readOnly?: boolean;
  /** Inline diagnostics (squiggles + gutter markers). Offsets are document character indices. */
  diagnostics?: Diagnostic[];
  /** Extra CodeMirror extensions, appended at mount. */
  extensions?: Extension[];
  /** Wrapper class. Give it a height (e.g. h-full) — the editor fills it. */
  className?: string;
  /** Receives the EditorView once mounted, for imperative access. */
  onReady?: (view: EditorView) => void;
}

/**
 * Generic CodeMirror 6 editor, themed to carapace tokens. Presentational and
 * domain-agnostic: it knows nothing about what it edits. Consumers own the document,
 * compute diagnostics, and wire any run/save affordances around it.
 */
export function CodeEditor({
  value,
  onChange,
  language = "javascript",
  readOnly = false,
  diagnostics,
  extensions = [],
  className,
  onReady,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const readOnlyComp = useRef(new Compartment());

  // Mount once. language/extensions are read here and not reconfigured live (a use
  // site edits one kind of document); remount via React key to switch languages.
  useEffect(() => {
    if (!host.current) return;
    const lang = language === "json" ? [json()] : language === "javascript" ? [javascript()] : [];
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          highlightSpecialChars(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          lintGutter(),
          syntaxHighlighting(highlight, { fallback: true }),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          ...lang,
          theme,
          readOnlyComp.current.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current?.(u.state.doc.toString());
          }),
          ...extensions,
        ],
      }),
    });
    view.current = v;
    onReady?.(v);
    return () => {
      v.destroy();
      view.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Controlled value: only patch when the prop diverges from the live doc (so typing
  // doesn't fight itself and the cursor survives).
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const cur = v.state.doc.toString();
    if (value !== cur) v.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
  }, [value]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    v.dispatch({
      effects: readOnlyComp.current.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
    });
  }, [readOnly]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    v.dispatch(setDiagnostics(v.state, diagnostics ?? []));
  }, [diagnostics]);

  return <div ref={host} className={className} />;
}
