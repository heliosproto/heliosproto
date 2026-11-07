"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/send/ConfirmDialog";
import { SendForm } from "@/components/send/SendForm";
import { SimulationPreview } from "@/components/send/SimulationPreview";
import type { SimulationResult } from "@/components/send/types";
import { Button } from "@/components/ui";
import { formatXlm } from "@/lib/account-reader";
import { loadCredential } from "@/lib/credential-store";
import { simulateTransferXlm } from "@/lib/send-client";
import type { SendFormValues } from "@/lib/validation/send";

type Step =
  | { kind: "loading" }
  | { kind: "no_credential" }
  | { kind: "no_account" }
  | { kind: "form"; smartAccount: string }
  | { kind: "simulating"; smartAccount: string; payload: SendFormValues }
  | {
      kind: "preview";
      smartAccount: string;
      payload: SendFormValues;
      simulation: SimulationResult;
    }
  | { kind: "error"; smartAccount: string; payload: SendFormValues; message: string };

/** Convert a "5.1234567" string into stroops (10^7 scale). Validation already
 * guarantees up to 7 decimal places and a positive number. */
function amountToStroops(amount: string): bigint {
  const [whole, fractional = ""] = amount.split(".");
  const paddedFraction = (fractional + "0000000").slice(0, 7);
  return BigInt(whole) * 10_000_000n + BigInt(paddedFraction);
}

export default function SendPage() {
  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const credential = await loadCredential();
        if (!credential) {
          setStep({ kind: "no_credential" });
          return;
        }
        if (!credential.smartAccountAddress) {
          setStep({ kind: "no_account" });
          return;
        }
        setStep({ kind: "form", smartAccount: credential.smartAccountAddress });
      } catch {
        setStep({ kind: "no_credential" });
      }
    })();
  }, []);

  const simulate = useCallback(async (smartAccount: string, values: SendFormValues) => {
    setStep({ kind: "simulating", smartAccount, payload: values });

    if (values.asset !== "XLM") {
      setStep({
        kind: "error",
        smartAccount,
        payload: values,
        message: `Asset ${values.asset} is not yet supported on testnet. Switch to XLM.`,
      });
      return;
    }

    const outcome = await simulateTransferXlm({
      from: smartAccount,
      to: values.recipient,
      amountStroops: amountToStroops(values.amount),
    });

    if (!outcome.success) {
      setStep({
        kind: "error",
        smartAccount,
        payload: values,
        message: outcome.error,
      });
      return;
    }

    const simulation: SimulationResult = {
      destination: values.recipient,
      asset: values.asset,
      amount: values.amount,
      memo: values.memo,
      feeEstimateXlm: formatXlm(outcome.totalFeeStroops),
    };

    setStep({ kind: "preview", smartAccount, payload: values, simulation });
  }, []);

  const handleValidSubmit = useCallback(
    (values: SendFormValues) => {
      const smartAccount =
        step.kind === "form" || step.kind === "preview" || step.kind === "error"
          ? step.smartAccount
          : null;
      if (!smartAccount) return;
      void simulate(smartAccount, values);
    },
    [simulate, step],
  );

  const handleEdit = useCallback(() => {
    if (step.kind !== "preview") return;
    setStep({ kind: "form", smartAccount: step.smartAccount });
  }, [step]);

  const handleConfirm = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const handleDialogCancel = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const handleDialogConfirm = useCallback(() => {
    // Broadcast lands in the next milestone; for now the simulate preview
    // is the honest stopping point.
    console.log("would submit", step.kind === "preview" ? step.payload : null);
    setDialogOpen(false);
  }, [step]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Send</h1>
        <p className="text-sm text-neutral-500">Send assets to a Stellar account or contract.</p>
      </header>

      {step.kind === "loading" && (
        <p className="text-sm text-neutral-500">Loading wallet from this device...</p>
      )}

      {step.kind === "no_credential" && (
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
          <p>No wallet is enrolled on this device yet.</p>
          <Link
            href="/app/onboard"
            className="inline-flex w-fit items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Create wallet
          </Link>
        </div>
      )}

      {step.kind === "no_account" && (
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
          <p>A passkey is enrolled, but no smart-account has been deployed yet.</p>
          <Link
            href="/app/onboard"
            className="inline-flex w-fit items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Continue onboarding
          </Link>
        </div>
      )}

      {step.kind === "form" && (
        <>
          <p className="text-xs text-neutral-500">
            From{" "}
            <span className="font-mono">
              {step.smartAccount.slice(0, 6)}...{step.smartAccount.slice(-6)}
            </span>
          </p>
          <SendForm onValidSubmit={handleValidSubmit} />
        </>
      )}

      {step.kind === "simulating" && (
        <section aria-live="polite" className="flex flex-col gap-3">
          <p className="text-sm text-neutral-500">
            Simulating transfer of {step.payload.amount} {step.payload.asset} to{" "}
            <span className="font-mono">
              {step.payload.recipient.slice(0, 6)}...{step.payload.recipient.slice(-6)}
            </span>
            ...
          </p>
          <p className="text-xs text-neutral-400">
            Checking balance, computing fee, and validating the destination on Soroban testnet.
          </p>
        </section>
      )}

      {step.kind === "preview" && (
        <SimulationPreview
          simulation={step.simulation}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
        />
      )}

      {step.kind === "error" && (
        <section
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm dark:border-red-800 dark:bg-red-950/40"
        >
          <p className="font-medium text-red-700 dark:text-red-300">Simulation failed</p>
          <p className="text-red-600 dark:text-red-400">{step.message}</p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setStep({ kind: "form", smartAccount: step.smartAccount })}
            >
              Back to form
            </Button>
            <Button onClick={() => simulate(step.smartAccount, step.payload)}>Retry</Button>
          </div>
        </section>
      )}

      {step.kind === "preview" && (
        <ConfirmDialog
          open={dialogOpen}
          simulation={step.simulation}
          onConfirm={handleDialogConfirm}
          onCancel={handleDialogCancel}
        />
      )}
    </main>
  );
}
