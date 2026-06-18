"use client";

import type { SimulationResult } from "@/components/send/types";
import { Button } from "@/components/ui";

interface SimulationPreviewProps {
  simulation: SimulationResult;
  /** Open the final confirmation dialog. */
  onConfirm: () => void;
  /** Return to the form to edit details. */
  onEdit: () => void;
}

interface RowProps {
  label: string;
  value: string;
  mono?: boolean;
}

function Row({ label, value, mono }: RowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd
        className={
          mono
            ? "break-all text-right font-mono text-sm text-neutral-900 dark:text-neutral-100"
            : "text-right text-sm font-medium text-neutral-900 dark:text-neutral-100"
        }
      >
        {value}
      </dd>
    </div>
  );
}


export function SimulationPreview({ simulation, onConfirm, onEdit }: SimulationPreviewProps) {
  return (
    <section aria-label="Simulation preview" className="flex flex-col gap-4">
      <header>
        <h2 className="text-base font-semibold">Review</h2>
        <p className="text-sm text-neutral-500">
          Simulated result. No transaction has been submitted yet.
        </p>
      </header>

      <dl className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 px-4 dark:divide-neutral-800 dark:border-neutral-800">
        <Row label="Destination" value={simulation.destination} mono />
        <Row label="Asset" value={simulation.asset} />
        <Row label="Amount" value={`${simulation.amount} ${simulation.asset}`} />
        {simulation.memo ? <Row label="Memo" value={simulation.memo} /> : null}
        <Row label="Estimated fee" value={`${simulation.feeEstimateXlm} XLM`} />
      </dl>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onEdit} className="flex-1">
          Edit
        </Button>
        <Button onClick={onConfirm} className="flex-1">
          Confirm
        </Button>
      </div>
    </section>
  );
}
