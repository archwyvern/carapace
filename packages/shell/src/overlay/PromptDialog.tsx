import { useRef, useState } from "react";
import { Modal } from "./Modal";
import { CANCEL_BTN, DIALOG_INPUT, confirmBtn } from "./dialogButton";

export interface PromptDialogProps {
  title: string;
  message?: string;
  initialValue?: string;
  confirmLabel?: string;
  placeholder?: string;
  /** Optional sync validator. Return a string to show as an error and block confirm. */
  validate?: (value: string) => string | null;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

/** Single-input prompt modal (a styled, validatable replacement for window.prompt). */
export function PromptDialog({
  title,
  message,
  initialValue,
  confirmLabel,
  placeholder,
  validate,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = value.trim();
  const validationError = validate ? validate(trimmed) : null;
  const canConfirm = trimmed !== "" && validationError === null;

  return (
    <Modal title={title} onClose={onCancel} initialFocus={inputRef} closeOnBackdrop={false}>
      {message && <p className="mb-3 text-sm text-fg-mid">{message}</p>}
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canConfirm) {
            // Stop the Enter from re-activating the trigger button once the modal
            // closes and focus restores to it (which would reopen the prompt).
            e.preventDefault();
            e.stopPropagation();
            onConfirm(trimmed);
          }
        }}
        aria-invalid={validationError !== null}
        className={DIALOG_INPUT}
        autoComplete="off"
        spellCheck={false}
      />
      {validationError && (
        <p role="alert" className="mb-2 text-sm text-error">
          {validationError}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={CANCEL_BTN}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => canConfirm && onConfirm(trimmed)}
          disabled={!canConfirm}
          className={confirmBtn({ disabled: !canConfirm })}
        >
          {confirmLabel ?? "Confirm"}
        </button>
      </div>
    </Modal>
  );
}
