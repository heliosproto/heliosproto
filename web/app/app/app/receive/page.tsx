"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  Droplets,
  ExternalLink,
  Fingerprint,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { formatXlm, readAccountState } from "@/lib/account-reader";
import { loadCredential } from "@/lib/credential-store";
import { EXPLORER_BASE } from "@/lib/factory-client";
import { type FundResult, fundSmartAccountFromFriendbot } from "@/lib/fund-client";

type ReceiveState =
  | { status: "loading" }
  | { status: "no_credential" }
  | { status: "no_account" }
  | { status: "ready"; address: string; xlmBalance: bigint | null }
  | { status: "funding"; address: string }
  | { status: "funded"; address: string; result: FundResult; newBalance: bigint | null }
  | { status: "error"; address: string; message: string };

const FUND_AMOUNT_XLM = 100;

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

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-3xl border border-border bg-card p-10">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div aria-hidden className="absolute inset-0 animate-ping rounded-full bg-watermelon/15" />
        <div
          className="relative flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg, var(--watermelon), var(--punch))" }}
        >
          <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
        </div>
      </div>
      <p className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
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
          No wallet to receive to
        </h2>
        <p className="max-w-sm text-balance text-sm text-muted-foreground">
          Create a passkey and deploy a smart-account on testnet before you can receive XLM.
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
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Wallet className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Deploy first</h2>
        <p className="max-w-sm text-balance text-sm text-muted-foreground">
          Your passkey is enrolled but no smart-account has been deployed yet. Finish onboarding to
          get a receive address.
        </p>
      </div>
      <Button size="lg" asChild className="h-11">
        <Link href="/app/onboard">Continue onboarding</Link>
      </Button>
    </div>
  );
}

function ErrorBlock({
  address,
  message,
  onRetry,
}: {
  address: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-3xl border border-destructive/30 bg-card p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
        <ShieldAlert className="h-7 w-7 text-destructive" aria-hidden />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">Something went wrong</h2>
        <p className="max-w-md text-sm text-muted-foreground" role="alert">
          {message}
        </p>
        {address && (
          <code className="mt-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
            Account: {address.slice(0, 8)}...{address.slice(-8)}
          </code>
        )}
      </div>
      <Button size="lg" onClick={onRetry} className="h-11">
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Try again
      </Button>
    </div>
  );
}

function ReadyBlock({
  address,
  xlmBalance,
  onFund,
}: {
  address: string;
  xlmBalance: bigint | null;
  onFund: () => void;
}) {
  const explorerAccount = `${EXPLORER_BASE}/contract/${address}`;
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col">
        <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-wider text-mint uppercase">
          <span className="h-px w-5 bg-mint" aria-hidden />
          Testnet receive address
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Fund your wallet
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Send testnet XLM to the address below, or use the one-click button to pull from friendbot.
        </p>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-5">
          <div className="rounded-2xl border border-border bg-white p-4">
            <QRCodeSVG
              value={address}
              size={176}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              marginSize={0}
            />
          </div>
          <div className="w-full">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Smart-account address
              </span>
              <a
                href={explorerAccount}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-mono text-[10px] font-medium tracking-wider text-watermelon uppercase transition hover:text-punch"
              >
                Explorer <ExternalLink className="h-2.5 w-2.5" aria-hidden />
              </a>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
              <code className="flex-1 break-all font-mono text-xs sm:text-sm">{address}</code>
              <CopyButton value={address} label="smart-account address" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklch, var(--watermelon) 22%, transparent), color-mix(in oklch, var(--mint) 10%, transparent))",
                border: "1px solid color-mix(in oklch, var(--watermelon) 25%, transparent)",
              }}
            >
              <Droplets className="h-5 w-5 text-watermelon" aria-hidden />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-base font-semibold tracking-tight">
                Fund with friendbot
              </h2>
              <p className="text-xs text-muted-foreground">
                Pulls {FUND_AMOUNT_XLM} XLM from the Stellar testnet friendbot into this
                smart-account via the native XLM Stellar Asset Contract. Takes 15 to 30 seconds.
              </p>
            </div>
          </div>
          <Button
            size="lg"
            onClick={onFund}
            className="h-11 shrink-0 border-0 bg-watermelon text-sm font-semibold text-watermelon-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--watermelon)_60%,transparent)] transition-transform hover:bg-punch hover:translate-y-[-1px]"
          >
            <Droplets className="mr-2 h-4 w-4" aria-hidden /> Fund with {FUND_AMOUNT_XLM} XLM
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-muted/30 p-5">
        <div className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Current balance
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-3xl font-semibold tracking-tight tabular-nums">
            {xlmBalance == null ? "unavailable" : formatXlm(xlmBalance)}
          </span>
          <span className="font-display text-lg text-muted-foreground">XLM</span>
        </div>
      </section>
    </div>
  );
}

function FundingBlock() {
  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-3xl border border-border bg-card p-10 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div aria-hidden className="absolute inset-0 animate-ping rounded-full bg-watermelon/20" />
        <div
          className="relative flex h-16 w-16 items-center justify-center rounded-full shadow-[0_14px_36px_-10px_color-mix(in_oklch,var(--punch)_60%,transparent)]"
          style={{ background: "linear-gradient(135deg, var(--watermelon), var(--punch))" }}
        >
          <Droplets className="h-7 w-7 animate-pulse text-white" aria-hidden />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">Funding your wallet</h2>
        <p className="max-w-sm text-balance text-sm text-muted-foreground">
          Funding an ephemeral payer, calling the native XLM contract, and waiting for inclusion.
          This usually takes 15 to 30 seconds.
        </p>
      </div>
    </div>
  );
}

function FundedBlock({
  address,
  result,
  newBalance,
}: {
  address: string;
  result: FundResult;
  newBalance: bigint | null;
}) {
  const xlmAmount = formatXlm(result.amountStroops);
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
          Funded on testnet
        </div>
        <h2 className="font-display text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          {xlmAmount} XLM is in your wallet
        </h2>
      </div>
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/40 p-4 text-left">
          <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            New balance
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tabular-nums">
              {newBalance == null ? xlmAmount : formatXlm(newBalance)}
            </span>
            <span className="font-display text-base text-muted-foreground">XLM</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/40 p-4 text-left">
          <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Transaction
          </span>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all font-mono text-xs sm:text-sm">{result.txHash}</code>
            <CopyButton value={result.txHash} label="transaction hash" />
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          asChild
          className="h-11 flex-1 border-0 bg-watermelon text-sm font-semibold text-watermelon-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--watermelon)_60%,transparent)] transition-transform hover:bg-punch hover:translate-y-[-1px]"
        >
          <a href={result.explorerUrl} target="_blank" rel="noreferrer noopener">
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden /> View transaction
          </a>
        </Button>
        <Button variant="outline" size="lg" asChild className="h-11 flex-1">
          <Link href="/app/dashboard">Back to wallet</Link>
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Funded to {address.slice(0, 6)}...{address.slice(-6)}
      </p>
    </div>
  );
}

export default function ReceivePage() {
  const [state, setState] = useState<ReceiveState>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const credential = await loadCredential();
      if (!credential) {
        setState({ status: "no_credential" });
        return;
      }
      if (!credential.smartAccountAddress) {
        setState({ status: "no_account" });
        return;
      }
      const account = await readAccountState(credential.smartAccountAddress);
      setState({
        status: "ready",
        address: credential.smartAccountAddress,
        xlmBalance: account.xlmBalance,
      });
    } catch (err) {
      setState({
        status: "error",
        address: "",
        message: err instanceof Error ? err.message : "Could not load wallet state.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFund = useCallback(async () => {
    if (state.status !== "ready") return;
    const address = state.address;
    setState({ status: "funding", address });
    try {
      const result = await fundSmartAccountFromFriendbot(address, FUND_AMOUNT_XLM);
      let newBalance: bigint | null = null;
      try {
        const after = await readAccountState(address);
        newBalance = after.xlmBalance;
      } catch {
        // Balance refresh is best-effort; fall back to the transferred amount.
      }
      setState({ status: "funded", address, result, newBalance });
    } catch (err) {
      setState({
        status: "error",
        address,
        message: err instanceof Error ? err.message : "Funding failed.",
      });
    }
  }, [state]);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 helios-grid-bg opacity-40" />
      <Header />
      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-6 pt-8 pb-20">
        {state.status === "loading" && <LoadingBlock label="Loading wallet from this device" />}
        {state.status === "no_credential" && <NoCredential />}
        {state.status === "no_account" && <NoAccount />}
        {state.status === "ready" && (
          <ReadyBlock
            address={state.address}
            xlmBalance={state.xlmBalance}
            onFund={() => void handleFund()}
          />
        )}
        {state.status === "funding" && <FundingBlock />}
        {state.status === "funded" && (
          <FundedBlock
            address={state.address}
            result={state.result}
            newBalance={state.newBalance}
          />
        )}
        {state.status === "error" && (
          <ErrorBlock address={state.address} message={state.message} onRetry={() => void load()} />
        )}
      </main>
    </div>
  );
}
