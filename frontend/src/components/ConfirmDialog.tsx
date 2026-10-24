import "./ConfirmDialog.css";
import React, { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal confirmation built on <dialog>: focus is trapped by the browser and Escape cancels. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> element itself
        if (e.target === ref.current) onCancel();
      }}
    >
      <div className="confirm-dialog__body">
        <span className="confirm-dialog__icon" aria-hidden="true">
          <AlertTriangle size={20} />
        </span>
        <div>
          <h2 id="confirm-dialog-title" className="confirm-dialog__title">
            {title}
          </h2>
          <p className="confirm-dialog__msg">{message}</p>
        </div>
      </div>
      <div className="confirm-dialog__actions">
        <button ref={cancelRef} className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn--danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
};
