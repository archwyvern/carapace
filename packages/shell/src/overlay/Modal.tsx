import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";

let modalSeq = 0;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  /** Heading text; also becomes the dialog's accessible name. */
  title?: string;
  /** Override the heading colour/classes (e.g. "text-error" for destructive). */
  titleClassName?: string;
  /** Accessible name when the dialog renders its own header instead of `title`. */
  ariaLabel?: string;
  onClose: () => void;
  /** Close when the backdrop is clicked (default true). */
  closeOnBackdrop?: boolean;
  /** Element to focus on open; defaults to the first focusable in the panel. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Override the panel classes (defaults to the standard surface card). */
  className?: string;
  children: ReactNode;
}

/**
 * Shared modal shell: backdrop scrim + a focus-trapped, screen-reader-announced
 * dialog. Tab cycles inside; focus restores to the trigger on close;
 * role=dialog + aria-modal + aria-labelledby; Escape closes.
 */
export function Modal({
  title,
  titleClassName,
  ariaLabel,
  onClose,
  closeOnBackdrop = true,
  initialFocus,
  className,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const headingId = useRef(`carapace-modal-${++modalSeq}`).current;

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const target = initialFocus?.current ?? panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
    target?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && panel) {
        const f = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (f.length === 0) {
          e.preventDefault();
          return;
        }
        const first = f[0]!;
        const last = f[f.length - 1]!;
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === panel)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("keydown", handleKey, true);
      restoreRef.current?.focus?.();
    };
  }, [onClose, initialFocus]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? headingId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        tabIndex={-1}
        className={className ?? "min-w-[280px] max-w-[400px] border border-border bg-surface-raised p-5 outline-none"}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 id={headingId} className={`mb-2 text-lg font-semibold ${titleClassName ?? "text-fg"}`}>
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
