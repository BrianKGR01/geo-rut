"use client";

import { useId } from "react";
import { Button } from "./Button";
import { useBackLayer } from "./useBackLayer";

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
  // "Atrás" en el celular equivale a cancelar, nunca a confirmar.
  useBackLayer(onCancel);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="sheet-in pb-safe w-full max-w-md rounded-2xl border-2 border-strong bg-card p-5 shadow-2xl"
      >
        <h2 id={titleId} className="font-display text-2xl font-bold uppercase tracking-wide">
          {title}
        </h2>
        <p id={messageId} className="mt-2 text-base text-soft">
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
