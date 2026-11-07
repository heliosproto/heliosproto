"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Fingerprint,
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/send/ConfirmDialog";
import { SendForm } from "@/components/send/SendForm";
import { SimulationPreview } from "@/components/send/SimulationPreview";
import type { SimulationResult } from "@/components/send/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { formatXlm } from "@/lib/account-reader";
import { loadCredential, storeAccountNonce } from "@/lib/credential-store";
import { mockPubkeyFromCredential } from "@/lib/factory-client";
import { broadcastTransferXlm, simulateTransferXlm } from "@/lib/send-client";
import type { SendFormValues } from "@/lib/validation/send";

type Step =
  | { kind: "loading" }
  | { kind: "no_credential" }
  | { kind: "no_account" }
  | {
      kind: "form";
      smartAccount: string;
      credentialId: string;
      accountNonce: bigint;
    }
  | {
      kind: "simulating";
      smartAccount: string;
      credentialId: string;
      accountNonce: bigint;
      payload: SendFormValues;
    }
  | {
      kind: "preview";
      smartAccount: string;
      credentialId: string;
      accountNonce: bigint;
      payload: SendFormValues;
      simulation: SimulationResult;
    }
  | {
      kind: "broadcasting";
      smartAccount: string;
      credentialId: string;
      accountNonce: bigint;
      payload: SendFormValues;
    }
  | {
      kind: "broadcasted";
      smartAccount: string;
      credentialId: string;
      accountNonce: bigint;
      payload: SendFormValues;
      txHash: string;
      explorerUrl: string;
    }
  | {
      kind: "error";
      smartAccount: string;
      credentialId: string;
      accountNonce: bigint;
      payload: SendFormValues;
      message: string;
    };

function amountToStroops(amount: string): bigint {
  const [whole, fractional = ""] = amount.split(".");
  const paddedFraction = `${fractional}0000000`.slice(0, 7);
  return BigInt(whole) * 10_000_000n + BigInt(paddedFraction);
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function truncate(value: string, head = 6, tail = 6): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(() => {
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  }, [value]);
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy ${label}`}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-mint" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-transparent bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="relative inline-block h-7 w-7 rounded-lg"
            style={{
              background: "linear-gradient(135deg, var(--watermelon) 0%, var(--punch) 100%)",
              boxShadow: "0 6px 20px -6px color-mix(in oklch, var(--watermelon) 60%, transparent)",
            }}
          >
            <span aria-hidden className="absolute inset-[2px] rounded-md border border-white/20" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">Helios</span>
          <span className="ml-1 rounded-md border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wider text-muted-foreground uppercase backdrop-blur">
            Alpha
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href="/app/dashboard">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden /> Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function LoadingBlock({ label, caption }: { label: string; caption?: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-3xl border border-border bg-card p-10 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div aria-hidden className="absolute inset-0 animate-ping rounded-full bg-watermelon/15" />
        <div
          className="relative flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg, var(--watermelon), var(--punch))" }}
        >
          <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        {caption && (
          <p className="max-w-sm text-balance text-xs text-muted-foreground">{caption}</p>
        )}
      </div>
    </div>
  );
}

function NoCredential() {
  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-3xl border border-border bg-card p-10 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--watermelon) 22%, transparent), color-mix(in oklch, var(--mint) 10%, transparent))",
          border: "1px solid color-mix(in oklch, var(--watermelon) 25%, transparent)",
        }}
      >
        <Fingerprint className="h-7 w-7 text-watermelon" aria-hidden />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          No wallet to send from
        </h2>
        <p className="max-w-sm text-balance text-sm text-muted-foreground">
          Create a passkey and deploy a smart-account on testnet before you can send.
        </p>
      </div>
      <Button
        size="lg"
        asChild
        className="h-11 border-0 bg-watermelon text-sm font-semibold text-watermelon-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--watermelon)_60%,transparent)] hover:bg-punch"
      >
        <Link href="/app/onboard">
          <Fingerprint className="mr-2 h-4 w-4" aria-hidden /> Create wallet
        </Link>
      </Button>
    </div>
  );
}

function NoAccount() {
  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-3xl border border-border bg-card p-10 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--watermelon) 22%, transparent), color-mix(in oklch, var(--mint) 10%, transparent))",
          border: "1px solid color-mix(in oklch, var(--watermelon) 25%, transparent)",
        }}
      >
        <Sparkles className="h-7 w-7 text-watermelon" aria-hidden />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Deploy first</h2>
        <p className="max-w-sm text-balance text-sm text-muted-foreground">
          Your passkey is enrolled, but no smart-account has been deployed yet. Finish onboarding to
          get a sendable address.
        </p>
      </div>
      <Button size="lg" asChild className="h-11">
        <Link href="/app/onboard">Continue onboarding</Link>
      </Button>
    </div>
  );
}

function ErrorBlock({
  smartAccount,
  message,
  onBack,
  onRetry,
}: {
  smartAccount: string;
  message: string;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-3xl border border-destructive/30 bg-card p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
        <ShieldAlert className="h-7 w-7 text-destructive" aria-hidden />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">Transaction failed</h2>
        <p className="max-w-md text-sm text-muted-foreground" role="alert">
          {message}
        </p>
        <p className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
          From {truncate(smartAccount, 8, 8)}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button variant="outline" size="lg" onClick={onBack} className="h-11">
          Back to form
        </Button>
        <Button
          size="lg"
          onClick={onRetry}
          className="h-11 border-0 bg-watermelon text-sm font-semibold text-watermelon-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--watermelon)_60%,transparent)] hover:bg-punch"
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Retry
        </Button>
      </div>
    </div>
  );
}

function BroadcastedBlock({
  payload,
  txHash,
  explorerUrl,
  onSendAnother,
}: {
  payload: SendFormValues;
  txHash: string;
  explorerUrl: string;
  onSendAnother: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-3xl border border-border bg-card p-8 text-center shadow-[0_20px_60px_-20px_color-mix(in_oklch,var(--mint)_18%,transparent)] animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--mint) 95%, white 5%), color-mix(in oklch, var(--mint) 70%, black 10%))",
        }}
      >
        <Check className="h-7 w-7 text-mint-foreground" aria-hidden />
      </div>
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-wider text-mint uppercase">
          <span className="h-px w-5 bg-mint" aria-hidden />
          Confirmed on testnet
        </div>
        <h2 className="font-display text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          Sent {payload.amount} {payload.asset}
        </h2>
        <p className="max-w-md text-balance text-sm text-muted-foreground">
          Delivered to{" "}
          <span className="font-mono text-foreground">{truncate(payload.recipient, 8, 8)}</span>.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/40 p-4 text-left">
          <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Transaction
          </span>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all font-mono text-xs sm:text-sm">{txHash}</code>
            <CopyButton value={txHash} label="transaction hash" />
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          asChild
          className="h-11 flex-1 border-0 bg-watermelon text-sm font-semibold text-watermelon-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--watermelon)_60%,transparent)] transition-transform hover:bg-punch hover:translate-y-[-1px]"
        >
          <a href={explorerUrl} target="_blank" rel="noreferrer noopener">
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden /> View on Stellar Expert
          </a>
        </Button>
        <Button variant="outline" size="lg" onClick={onSendAnother} className="h-11 flex-1">
          <Send className="mr-2 h-4 w-4" aria-hidden /> Send another
        </Button>
      </div>
    </div>
  );
}

function FormBlock({
  smartAccount,
  accountNonce,
  onValidSubmit,
}: {
  smartAccount: string;
  accountNonce: bigint;
  onValidSubmit: (values: SendFormValues) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col">
        <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-wider text-mint uppercase">
          <span className="h-px w-5 bg-mint" aria-hidden />
          Send on Soroban testnet
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Where should this go?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed with your passkey through your smart-account's auth path.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-3">
        <div className="flex min-w-0 flex-col">
          <span className="font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            From
          </span>
          <code className="truncate font-mono text-xs">{smartAccount}</code>
        </div>
        <span
          className="shrink-0 rounded-full bg-mint/15 px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider text-mint uppercase"
          title={`Account nonce ${accountNonce}`}
        >
          Nonce {accountNonce.toString()}
        </span>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6">
        <SendForm onValidSubmit={onValidSubmit} />
      </div>
    </div>
  );
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
        setStep({
          kind: "form",
          smartAccount: credential.smartAccountAddress,
          credentialId: bytesToBase64(credential.credentialId),
          accountNonce: credential.accountNonce ?? 0n,
        });
      } catch {
        setStep({ kind: "no_credential" });
      }
    })();
  }, []);

  const simulate = useCallback(
    async (
      smartAccount: string,
      credentialId: string,
      accountNonce: bigint,
      values: SendFormValues,
    ) => {
      setStep({ kind: "simulating", smartAccount, credentialId, accountNonce, payload: values });

      if (values.asset !== "XLM") {
        setStep({
          kind: "error",
          smartAccount,
          credentialId,
          accountNonce,
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
          credentialId,
          accountNonce,
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

      setStep({
        kind: "preview",
        smartAccount,
        credentialId,
        accountNonce,
        payload: values,
        simulation,
      });
    },
    [],
  );

  const handleValidSubmit = useCallback(
    (values: SendFormValues) => {
      if (step.kind !== "form" && step.kind !== "preview" && step.kind !== "error") {
        return;
      }
      void simulate(step.smartAccount, step.credentialId, step.accountNonce, values);
    },
    [simulate, step],
  );

  const handleEdit = useCallback(() => {
    if (step.kind !== "preview") return;
    setStep({
      kind: "form",
      smartAccount: step.smartAccount,
      credentialId: step.credentialId,
      accountNonce: step.accountNonce,
    });
  }, [step]);

  const handleConfirm = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const handleDialogCancel = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const handleDialogConfirm = useCallback(async () => {
    if (step.kind !== "preview") return;
    setDialogOpen(false);
    const base = step;
    setStep({
      kind: "broadcasting",
      smartAccount: base.smartAccount,
      credentialId: base.credentialId,
      accountNonce: base.accountNonce,
      payload: base.payload,
    });

    try {
      const primarySignerPubkey = await mockPubkeyFromCredential(base.credentialId);
      const outcome = await broadcastTransferXlm({
        from: base.smartAccount,
        to: base.payload.recipient,
        amountStroops: amountToStroops(base.payload.amount),
        primarySignerPubkey,
        accountNonce: base.accountNonce,
      });

      if (!outcome.success) {
        setStep({
          kind: "error",
          smartAccount: base.smartAccount,
          credentialId: base.credentialId,
          accountNonce: base.accountNonce,
          payload: base.payload,
          message: outcome.error,
        });
        return;
      }

      try {
        await storeAccountNonce(outcome.nextAccountNonce);
      } catch {
        // Nonce persistence is best-effort; broadcast already succeeded.
      }

      setStep({
        kind: "broadcasted",
        smartAccount: base.smartAccount,
        credentialId: base.credentialId,
        accountNonce: outcome.nextAccountNonce,
        payload: base.payload,
        txHash: outcome.txHash,
        explorerUrl: outcome.explorerUrl,
      });
    } catch (err) {
      setStep({
        kind: "error",
        smartAccount: base.smartAccount,
        credentialId: base.credentialId,
        accountNonce: base.accountNonce,
        payload: base.payload,
        message: err instanceof Error ? err.message : "Broadcast failed.",
      });
    }
  }, [step]);

  const handleSendAnother = useCallback(() => {
    if (step.kind !== "broadcasted") return;
    setStep({
      kind: "form",
      smartAccount: step.smartAccount,
      credentialId: step.credentialId,
      accountNonce: step.accountNonce,
    });
  }, [step]);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 helios-grid-bg opacity-40" />
      <Header />
      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center px-6 pt-8 pb-20">
        {step.kind === "loading" && <LoadingBlock label="Loading wallet from this device" />}
        {step.kind === "no_credential" && <NoCredential />}
        {step.kind === "no_account" && <NoAccount />}
        {step.kind === "form" && (
          <FormBlock
            smartAccount={step.smartAccount}
            accountNonce={step.accountNonce}
            onValidSubmit={handleValidSubmit}
          />
        )}
        {step.kind === "simulating" && (
          <LoadingBlock
            label="Simulating on Soroban testnet"
            caption={`Composing ${step.payload.amount} ${step.payload.asset} to ${truncate(step.payload.recipient, 6, 6)}, computing fee, validating destination.`}
          />
        )}
        {step.kind === "preview" && (
          <SimulationPreview
            simulation={step.simulation}
            onConfirm={handleConfirm}
            onEdit={handleEdit}
          />
        )}
        {step.kind === "broadcasting" && (
          <LoadingBlock
            label="Broadcasting"
            caption="Signing the Soroban auth entry with your passkey, submitting the transaction, and polling for inclusion. Takes 15 to 30 seconds."
          />
        )}
        {step.kind === "broadcasted" && (
          <BroadcastedBlock
            payload={step.payload}
            txHash={step.txHash}
            explorerUrl={step.explorerUrl}
            onSendAnother={handleSendAnother}
          />
        )}
        {step.kind === "error" && (
          <ErrorBlock
            smartAccount={step.smartAccount}
            message={step.message}
            onBack={() =>
              setStep({
                kind: "form",
                smartAccount: step.smartAccount,
                credentialId: step.credentialId,
                accountNonce: step.accountNonce,
              })
            }
            onRetry={() =>
              simulate(step.smartAccount, step.credentialId, step.accountNonce, step.payload)
            }
          />
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
    </div>
  );
}
