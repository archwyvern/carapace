import { useRef, useState } from "react";
import { Modal } from "./Modal";
import { CANCEL_BTN, confirmBtn } from "./dialogButton";

export interface TypedConfirmDialogProps {
  title: string;
  message: string;
  /** The exact string the user must type to enable the destroy button. */
  expectedText: string;
  /** Optional label for the typed-text field, e.g. "project name". */
  expectedLabel?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Destructive confirm gated by a typed-name match (GitHub repo-deletion style).
 * For top-level destructive actions on a settings page — not list views or menus.
 */
export function TypedConfirmDialog({
  title,
  message,
  expectedText,
  expectedLabel,
  confirmLabel,
  onConfirm,
  onCancel,
}: TypedConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = typed === expectedText;

  return (
    <Modal
      title={title}
      titleClassName="text-error"
      onClose={onCancel}
      initialFocus={inputRef}
      className="min-w-[320px] max-w-[440px] border border-error/40 bg-surface-raised p-5 outline-none"
    >
      <p className="mb-3 whitespace-pre-line text-sm text-fg-mid">{message}</p>
      <p className="mb-1.5 text-sm text-fg-mid">
        Type{" "}
        <span className="border border-border bg-surface-sunken px-1 font-mono text-fg">{expectedText}</span>{" "}
        to confirm{expectedLabel ? ` the ${expectedLabel}` : ""}:
      </p>
      <input
        ref={inputRef}
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches) onConfirm();
        }}
        className="mb-4 w-full border border-border bg-surface-sunken px-2.5 py-1 text-sm text-fg outline-none focus:border-error"
        autoComplete="off"
        spellCheck={false}
        aria-label={expectedLabel ? `Type ${expectedLabel} to confirm` : "Type to confirm"}
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={CANCEL_BTN}>
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!matches}
          className={confirmBtn({ danger: true, disabled: !matches })}
        >
          {confirmLabel ?? "Delete"}
        </button>
      </div>
    </Modal>
  );
}
