import { useRef } from "react";
import { Modal } from "./Modal";
import { CANCEL_BTN, confirmBtn } from "./dialogButton";

export interface ConfirmDialogProps {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Optional third action rendered leftmost (e.g. "Don't Save"); pairs with onTertiary. */
  tertiaryLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onTertiary?: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  tertiaryLabel,
  danger,
  onConfirm,
  onCancel,
  onTertiary,
}: ConfirmDialogProps) {
  // Destructive actions focus Cancel so a stray Enter doesn't commit.
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      title={title}
      titleClassName={danger ? "text-error" : undefined}
      onClose={onCancel}
      initialFocus={danger ? cancelRef : confirmRef}
    >
      {message && <p className="mb-4 whitespace-pre-line text-sm text-fg-mid">{message}</p>}
      <div className="flex justify-end gap-2">
        {tertiaryLabel && (
          <button type="button" onClick={onTertiary} className={`mr-auto ${CANCEL_BTN}`}>
            {tertiaryLabel}
          </button>
        )}
        <button ref={cancelRef} type="button" onClick={onCancel} className={CANCEL_BTN}>
          {cancelLabel ?? "Cancel"}
        </button>
        <button ref={confirmRef} type="button" onClick={onConfirm} className={confirmBtn({ danger })}>
          {confirmLabel ?? "Confirm"}
        </button>
      </div>
    </Modal>
  );
}
