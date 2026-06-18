"use client";

import { useEffect, useRef } from "react";
import type { SimulationResult } from "@/components/send/types";
import { Button } from "@/components/ui";

interface ConfirmDialogProps {
  open: boolean;
  simulation: SimulationResult;
  /** User confirms the final submission. */
  onConfirm: () => void;
  /** User cancels (button, backdrop, or Escape). */
  onCancel: () => void;
}


export function ConfirmDialog({ open, simulation, onConfirm, onCancel }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    confirmRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative z-10 w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold">
          Confirm send
        </h2>
        <p id="confirm-dialog-description" className="mt-1 text-sm text-neutral-500">
          You're about to send {simulation.amount} {simulation.asset} to{" "}
          <span className="break-all font-mono text-neutral-700 dark:text-neutral-300">
            {simulation.destination}
          </span>
          . This action can't be undone.
        </p>

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button ref={confirmRef} onClick={onConfirm} className="flex-1">
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
