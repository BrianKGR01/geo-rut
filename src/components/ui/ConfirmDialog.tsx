"use client";

import { useId } from "react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const { title, message, confirmLabel, cancelLabel = "Cancelar", destructive, onConfirm, onCancel } = props;
  const titleId = useId();
  const messageId = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="pb-safe w-full max-w-md rounded-2xl bg-paper p-5 shadow-xl"
      >
        <h2 id={titleId} className="text-xl font-extrabold">
          {title}
        </h2>
        <p id={messageId} className="mt-2 text-base text-ink-soft">
          {message}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button variant={destructive ? "danger" : "primary"} big onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
