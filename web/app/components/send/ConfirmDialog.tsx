"use client";

import { Fingerprint, ShieldAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import type { SimulationResult } from "@/components/send/types";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  simulation: SimulationResult;
  onConfirm: () => void;
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
        className="absolute inset-0 cursor-default bg-background/80 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative z-10 flex w-full max-w-md flex-col gap-5 rounded-3xl border border-border bg-card p-7 shadow-[0_20px_60px_-20px_color-mix(in_oklch,var(--watermelon)_25%,transparent)] animate-in fade-in-0 zoom-in-95 duration-200"
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--watermelon) 22%, transparent), color-mix(in oklch, var(--mint) 10%, transparent))",
            border: "1px solid color-mix(in oklch, var(--watermelon) 25%, transparent)",
          }}
        >
          <Fingerprint className="h-6 w-6 text-watermelon" aria-hidden />
        </div>

        <div className="flex flex-col gap-2">
          <h2
            id="confirm-dialog-title"
            className="font-display text-xl font-semibold tracking-tight"
          >
            Confirm send
          </h2>
          <p id="confirm-dialog-description" className="text-sm text-muted-foreground">
            You are about to send{" "}
            <span className="font-semibold text-foreground">
              {simulation.amount} {simulation.asset}
            </span>{" "}
            to{" "}
            <span className="break-all font-mono text-xs text-foreground">
              {simulation.destination.slice(0, 6)}...{simulation.destination.slice(-6)}
            </span>
            . This action cannot be undone once the transaction clears.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-watermelon" aria-hidden />
          <span>
            Signed with your passkey as Soroban auth; the estimated fee is{" "}
            <span className="font-medium text-foreground">{simulation.feeEstimateXlm} XLM</span>.
          </span>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onCancel}
            className="h-11 flex-1"
          >
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            size="lg"
            onClick={onConfirm}
            className="h-11 flex-1 border-0 bg-watermelon text-sm font-semibold text-watermelon-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--watermelon)_60%,transparent)] transition-transform hover:bg-punch hover:translate-y-[-1px]"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
