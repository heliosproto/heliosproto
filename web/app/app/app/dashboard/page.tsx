"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  Fingerprint,
  Loader2,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { type AccountState, formatXlm, readAccountState } from "@/lib/account-reader";
import { loadCredential } from "@/lib/credential-store";
import { EXPLORER_BASE } from "@/lib/factory-client";

type DashboardState =
  | { status: "loading" }
  | { status: "no_credential" }
  | { status: "no_account"; publicKey: string }
  | { status: "reading"; address: string }
  | { status: "ready"; account: AccountState }
  | { status: "error"; address: string; message: string };

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
            <Link href="/">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden /> Back home
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function LoadingCard({ label }: { label: string }) {
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

function EmptyState() {
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
          No wallet on this device
        </h2>
        <p className="max-w-sm text-balance text-sm text-muted-foreground">
          Create a passkey and deploy a smart-account on Soroban testnet to open your dashboard.
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

function NoAccountYet({ publicKey }: { publicKey: string }) {
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
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          One step from your smart-account
        </h2>
        <p className="max-w-md text-balance text-sm text-muted-foreground">
          Your passkey {truncate(publicKey, 6, 6)} is stored on this device. Deploy a smart-account
          on Soroban testnet so it controls a real on-chain contract.
        </p>
      </div>
      <Button
        size="lg"
        asChild
        className="h-11 border-0 bg-watermelon text-sm font-semibold text-watermelon-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--watermelon)_60%,transparent)] hover:bg-punch"
      >
        <Link href="/app/onboard">Deploy on testnet</Link>
      </Button>
    </div>
  );
}

function ErrorState({
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
      <h2 className="font-display text-xl font-semibold tracking-tight">Could not read account</h2>
      <p className="max-w-md text-sm text-muted-foreground" role="alert">
        {message}
      </p>
      {address && (
        <p className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
          {truncate(address, 8, 8)}
        </p>
      )}
      <Button size="lg" onClick={onRetry} className="h-11">
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Try again
      </Button>
    </div>
  );
}

function Ready({ account, onRefresh }: { account: AccountState; onRefresh: () => void }) {
  const balanceStr = account.xlmBalance == null ? "unavailable" : formatXlm(account.xlmBalance);
  const balanceAvailable = account.xlmBalance != null;
  const explorerAccount = `${EXPLORER_BASE}/contract/${account.address}`;
  const explorerPlugin = account.sessionKeysPlugin
    ? `${EXPLORER_BASE}/contract/${account.sessionKeysPlugin}`
    : null;

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-wider text-mint uppercase">
            <span className="h-px w-5 bg-mint" aria-hidden />
            Live on Soroban testnet
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Your wallet
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="h-9"
          aria-label="Refresh account state"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Refresh
        </Button>
      </div>

      <section
        className="relative overflow-hidden rounded-3xl p-6 shadow-[0_20px_60px_-20px_color-mix(in_oklch,var(--watermelon)_25%,transparent)]"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--watermelon) 95%, white 5%), color-mix(in oklch, var(--punch) 85%, black 10%))",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 helios-grid-bg opacity-20"
        />
        <div className="relative flex flex-col gap-5 text-white">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-wider uppercase opacity-80">
              <Wallet className="h-3.5 w-3.5" aria-hidden /> Balance
            </span>
            <a
              href={explorerAccount}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 font-mono text-[11px] font-medium tracking-wider uppercase opacity-80 transition hover:opacity-100"
            >
              View on explorer <ArrowUpRight className="h-3 w-3" aria-hidden />
            </a>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-semibold tracking-tight tabular-nums">
              {balanceStr}
            </span>
            <span className="font-display text-xl font-medium opacity-80">XLM</span>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-xl bg-black/15 p-3 backdrop-blur-sm">
            <div className="flex min-w-0 flex-col">
              <span className="font-mono text-[10px] font-medium tracking-wider uppercase opacity-70">
                Smart-account address
              </span>
              <code className="truncate font-mono text-xs sm:text-sm">{account.address}</code>
            </div>
            <CopyButton value={account.address} label="smart-account address" />
          </div>
          {!balanceAvailable && (
            <p className="text-xs opacity-80">
              Balance query failed. The account is live on-chain; retry from the button above.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Button
          variant="outline"
          asChild
          className="h-auto flex-col items-start gap-2 rounded-2xl border-border p-4 text-left"
        >
          <Link href="/app/receive">
            <QrCode className="h-4 w-4 text-watermelon" aria-hidden />
            <span className="font-display text-base font-semibold">Receive</span>
            <span className="text-xs text-muted-foreground">Fund with testnet XLM</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          asChild
          className="h-auto flex-col items-start gap-2 rounded-2xl border-border p-4 text-left"
        >
          <Link href="/app/send">
            <Send className="h-4 w-4 text-watermelon" aria-hidden />
            <span className="font-display text-base font-semibold">Send</span>
            <span className="text-xs text-muted-foreground">Sign with your passkey</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          asChild
          className="h-auto flex-col items-start gap-2 rounded-2xl border-border p-4 text-left"
        >
          <Link href="/app/settings">
            <ShieldCheck className="h-4 w-4 text-watermelon" aria-hidden />
            <span className="font-display text-base font-semibold">Settings</span>
            <span className="text-xs text-muted-foreground">Session keys, recovery</span>
          </Link>
        </Button>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck
              className={`h-4 w-4 ${account.pluginMatchesExpected ? "text-mint" : "text-muted-foreground"}`}
              aria-hidden
            />
            <h2 className="font-display text-base font-semibold tracking-tight">
              Installed plugins
            </h2>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider uppercase ${
              account.pluginMatchesExpected
                ? "border-mint/40 bg-mint/10 text-mint"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {account.pluginMatchesExpected ? (
              <>
                <Check className="h-3 w-3" aria-hidden /> Verified on-chain
              </>
            ) : (
              "Not wired"
            )}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-semibold">Session keys</span>
                {account.pluginMatchesExpected && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-mint/15 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider text-mint uppercase">
                    <Check className="h-2.5 w-2.5" aria-hidden /> Live
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Scoped signers with expiry and spending caps, enforced by the account itself.
              </p>
              {account.sessionKeysPlugin ? (
                <code className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                  {account.sessionKeysPlugin}
                </code>
              ) : (
                <span className="mt-1 text-xs text-muted-foreground">
                  No plugin wired on this account.
                </span>
              )}
            </div>
            {explorerPlugin && (
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <a href={explorerPlugin} target="_blank" rel="noreferrer noopener">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Explorer
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const credential = await loadCredential();
      if (!credential) {
        setState({ status: "no_credential" });
        return;
      }
      if (!credential.smartAccountAddress) {
        const pk = btoa(String.fromCharCode(...new Uint8Array(credential.publicKey)));
        setState({ status: "no_account", publicKey: pk });
        return;
      }
      setState({ status: "reading", address: credential.smartAccountAddress });
      try {
        const account = await readAccountState(credential.smartAccountAddress);
        setState({ status: "ready", account });
      } catch (err) {
        setState({
          status: "error",
          address: credential.smartAccountAddress,
          message:
            err instanceof Error ? err.message : "Unexpected error reading on-chain account state.",
        });
      }
    } catch (err) {
      setState({
        status: "error",
        address: "",
        message: err instanceof Error ? err.message : "Could not load credential from device.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 helios-grid-bg opacity-40" />
      <Header />
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-6 pt-8 pb-20">
        {state.status === "loading" && <LoadingCard label="Loading wallet from this device" />}
        {state.status === "no_credential" && <EmptyState />}
        {state.status === "no_account" && <NoAccountYet publicKey={state.publicKey} />}
        {state.status === "reading" && <LoadingCard label="Reading account state on testnet" />}
        {state.status === "ready" && (
          <Ready account={state.account} onRefresh={() => void load()} />
        )}
        {state.status === "error" && (
          <ErrorState address={state.address} message={state.message} onRetry={() => void load()} />
        )}
      </main>
    </div>
  );
}
