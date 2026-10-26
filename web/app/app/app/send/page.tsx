"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/send/ConfirmDialog";
import { SendForm } from "@/components/send/SendForm";
import { SimulationPreview } from "@/components/send/SimulationPreview";
import { buildMockSimulation, type SimulationResult } from "@/components/send/types";
import type { SendFormValues } from "@/lib/validation/send";

type Step = "form" | "preview";

export default function SendPage() {
  const [step, setStep] = useState<Step>("form");
  const [payload, setPayload] = useState<SendFormValues | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleValidSubmit(values: SendFormValues) {
    // Simulation is mocked for this issue; real RPC integration lands later.
    setPayload(values);
    setSimulation(buildMockSimulation(values));
    setStep("preview");
  }

  function handleEdit() {
    setStep("form");
  }

  function handleConfirm() {
    setDialogOpen(true);
  }

  function handleDialogCancel() {
    setDialogOpen(false);
  }

  function handleDialogConfirm() {
    // Placeholder — real submission is wired up via sdk-react in a later issue.
    console.log("would submit", payload);
    setDialogOpen(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Send</h1>
        <p className="text-sm text-neutral-500">Send assets to a Stellar account or contract.</p>
      </header>

      {step === "form" ? (
        <SendForm onValidSubmit={handleValidSubmit} defaultValues={payload ?? undefined} />
      ) : null}

      {step === "preview" && simulation ? (
        <SimulationPreview simulation={simulation} onConfirm={handleConfirm} onEdit={handleEdit} />
      ) : null}

      {simulation ? (
        <ConfirmDialog
          open={dialogOpen}
          simulation={simulation}
          onConfirm={handleDialogConfirm}
          onCancel={handleDialogCancel}
        />
      ) : null}
    </main>
  );
}
