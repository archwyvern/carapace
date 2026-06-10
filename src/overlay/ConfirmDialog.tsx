import { useRef } from "react";
import { Modal } from "./Modal";
import { CANCEL_BTN, confirmBtn } from "./dialogButton";

export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
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
      <p className="mb-4 text-sm text-fg-mid">{message}</p>
      <div className="flex justify-end gap-2">
        <button ref={cancelRef} type="button" onClick={onCancel} className={CANCEL_BTN}>
          Cancel
        </button>
        <button ref={confirmRef} type="button" onClick={onConfirm} className={confirmBtn({ danger })}>
          {confirmLabel ?? "Confirm"}
        </button>
      </div>
    </Modal>
  );
}
