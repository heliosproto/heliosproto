"use client";

import { ArrowRight, Check, Pencil } from "lucide-react";
import type { SimulationResult } from "@/components/send/types";
import { Button } from "@/components/ui/button";

interface SimulationPreviewProps {
  simulation: SimulationResult;
  onConfirm: () => void;
  onEdit: () => void;
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="shrink-0 font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "min-w-0 flex-1 break-all text-right font-mono text-sm text-foreground"
            : highlight
              ? "min-w-0 flex-1 text-right font-display text-base font-semibold text-foreground"
              : "min-w-0 flex-1 text-right text-sm font-medium text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export function SimulationPreview({ simulation, onConfirm, onEdit }: SimulationPreviewProps) {
  return (
    <section aria-label="Simulation preview" className="flex flex-col gap-5">
      <div className="flex flex-col">
        <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-wider text-mint uppercase">
          <span className="h-px w-5 bg-mint" aria-hidden />
          Simulated on testnet
        </div>
        <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">Review</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is a dry run. No transaction has been submitted yet.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <dl className="divide-y divide-border">
          <Row label="Amount" value={`${simulation.amount} ${simulation.asset}`} highlight />
          <Row label="Destination" value={simulation.destination} mono />
          {simulation.memo ? <Row label="Memo" value={simulation.memo} /> : null}
          <Row label="Estimated fee" value={`${simulation.feeEstimateXlm} XLM`} />
        </dl>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" size="lg" onClick={onEdit} className="h-11 flex-1">
          <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Edit
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={onConfirm}
          className="h-11 flex-1 border-0 bg-watermelon text-sm font-semibold text-watermelon-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--watermelon)_60%,transparent)] transition-transform hover:bg-punch hover:translate-y-[-1px]"
        >
          Confirm
          <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
        </Button>
      </div>

      <p className="flex items-center gap-1.5 text-center text-[11px] text-muted-foreground">
        <Check className="h-3 w-3 text-mint" aria-hidden />
        Next step signs with your passkey and broadcasts
      </p>
    </section>
  );
}
