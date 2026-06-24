import Editor, { type BeforeMount, type OnChange, type Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";

/** Built-in dark theme, registered automatically. Tuned to carapace's dark surfaces;
 *  override by passing your own `theme` (and defining it in `beforeMount`). */
export const CARAPACE_DARK_THEME = "carapace-dark";

function defineCarapaceTheme(monaco: Monaco): void {
  monaco.editor.defineTheme(CARAPACE_DARK_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6A7A55", fontStyle: "italic" },
      { token: "keyword", foreground: "C586C0" },
      { token: "string", foreground: "C3A56A" },
      { token: "number", foreground: "B5CEA8" },
      { token: "type", foreground: "7ABAD4" },
      { token: "function", foreground: "DCDCAA" },
      { token: "variable", foreground: "BFC0BA" },
      { token: "identifier", foreground: "BFC0BA" },
      { token: "property", foreground: "9CDCFE" },
      { token: "operator", foreground: "D4D4D4" },
    ],
    colors: {
      "editor.background": "#1A1B1C",
      "editor.foreground": "#BBBEBF",
      "editor.lineHighlightBackground": "#242526",
      "editorLineNumber.foreground": "#6B6E6F",
      "editorLineNumber.activeForeground": "#BBBEBF",
      "editorCursor.foreground": "#BBBEBF",
    },
  });
}

const DEFAULT_OPTIONS: MonacoEditor.IStandaloneEditorConstructionOptions = {
  fontSize: 13,
  minimap: { enabled: false },
  renderLineHighlight: "line",
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  scrollBeyondLastLine: true,
  smoothScrolling: true,
  automaticLayout: true,
};

export interface CodeEditorProps {
  /** Document text (controlled). Omit when managing models imperatively via `onMount`. */
  value?: string;
  /** Monaco language id (e.g. "typescript"). Omit when driving the model directly. */
  language?: string;
  /** Model path/URI; lets Monaco keep a model (and its view state) per file. */
  path?: string;
  /** Theme id. Defaults to the built-in carapace dark theme. */
  theme?: string;
  /** Monaco construction options, merged over carapace defaults. */
  options?: MonacoEditor.IStandaloneEditorConstructionOptions;
  /** Wrapper class. Give it a height (e.g. h-full) — the editor fills it. */
  className?: string;
  /** Fired on every edit with the full document. */
  onChange?: (value: string) => void;
  /** Register custom languages/themes/diagnostics before mount. The carapace default
   *  theme is already defined when this runs. */
  beforeMount?: (monaco: Monaco) => void;
  /** Imperative access once mounted — manage models, add commands, attach diagnostics. */
  onMount?: (editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => void;
}

/**
 * Monaco-based code editor, the shell's editor primitive. Presentational and
 * domain-agnostic: it owns the Monaco mount, a dark theme, and sane defaults, but
 * knows nothing about what it edits. Consumers register languages and wire models,
 * diagnostics, and save/run affordances through `beforeMount` / `onMount`.
 */
export function CodeEditor({
  value, language, path, theme = CARAPACE_DARK_THEME, options, className = "h-full", onChange, beforeMount, onMount,
}: CodeEditorProps) {
  const handleBeforeMount: BeforeMount = (monaco) => {
    defineCarapaceTheme(monaco);
    beforeMount?.(monaco);
  };
  const handleChange: OnChange = (next) => onChange?.(next ?? "");
  return (
    <div className={className}>
      <Editor
        theme={theme}
        value={value}
        language={language}
        path={path}
        beforeMount={handleBeforeMount}
        onMount={onMount}
        onChange={handleChange}
        options={{ ...DEFAULT_OPTIONS, ...options }}
      />
    </div>
  );
}
