import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * ConfirmDialog – a lightweight modal built on the native <dialog> element.
 *
 * Props:
 *   open        – boolean, controls visibility
 *   title       – string, dialog heading
 *   description – string, body text
 *   confirmLabel – string (default "Confirm")
 *   cancelLabel  – string (default "Cancel")
 *   variant      – "danger" | "default"  (default "default")
 *   onConfirm   – () => void
 *   onCancel    – () => void
 */
export function ConfirmDialog({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [open]);

  // Close on backdrop click
  function handleBackdropClick(e) {
    if (e.target === ref.current) onCancel?.();
  }

  return (
    <dialog
      ref={ref}
      onClick={handleBackdropClick}
      className="m-auto w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className={
              variant === "danger"
                ? "bg-red-600 text-white hover:bg-red-700"
                : undefined
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
