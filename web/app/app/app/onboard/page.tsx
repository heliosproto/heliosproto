"use client";

import { ArrowLeft, Check, Copy, Fingerprint, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadCredential, type StoredCredential, storeCredential } from "@/lib/credential-store";
import { createPasskey, type PasskeyCredential, truncatePublicKey } from "@/lib/passkey";
import { predictAccountAddress } from "@/lib/predict-address";

type OnboardingState =
  | { status: "loading" }
  | { status: "welcome" }
  | { status: "enrolling" }
  | { status: "error"; message: string }
  | {
      status: "complete";
      credential: PasskeyCredential;
      accountAddress: string;
    };

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function storedCredentialToPasskey(stored: StoredCredential): PasskeyCredential {
  const credentialId = btoa(String.fromCharCode(...new Uint8Array(stored.credentialId)));
  const publicKey = btoa(String.fromCharCode(...new Uint8Array(stored.publicKey)));
  return { credentialId, publicKey };
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
      .catch(() => {
        /* clipboard not available */
      });
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

export default function OnboardPage() {
  const [state, setState] = useState<OnboardingState>({ status: "loading" });
  const [walletName, setWalletName] = useState("");

  const webAuthnSupported = useMemo(() => {
    if (typeof window === "undefined") return true;
    return typeof window.PublicKeyCredential !== "undefined";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkExistingCredential() {
      try {
        const existing = await loadCredential();
        if (cancelled) return;

        if (existing) {
          const passkey = storedCredentialToPasskey(existing);
          const accountAddress = await predictAccountAddress(passkey.credentialId);
          if (cancelled) return;

          setState({ status: "complete", credential: passkey, accountAddress });
        } else {
          setState({ status: "welcome" });
        }
      } catch {
        if (!cancelled) setState({ status: "welcome" });
      }
    }

    checkExistingCredential();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnroll = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      setState({ status: "enrolling" });

      try {
        const passkey = await createPasskey(walletName);
        const credentialIdBytes = base64ToBytes(passkey.credentialId);
        const publicKeyBytes = base64ToBytes(passkey.publicKey);
        await storeCredential(credentialIdBytes, publicKeyBytes);
        const accountAddress = await predictAccountAddress(passkey.credentialId);
        setState({ status: "complete", credential: passkey, accountAddress });
      } catch (err) {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setState({
            status: "error",
            message: "Passkey creation was cancelled. Try again when you are ready.",
          });
        } else {
          setState({
            status: "error",
            message:
              err instanceof Error
                ? err.message
                : "An unexpected error occurred during passkey creation.",
          });
        }
      }
    },
    [walletName],
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 helios-grid-bg opacity-60" />

      <header className="sticky top-0 z-50 border-b border-transparent bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="relative inline-block h-7 w-7 rounded-lg"
              style={{
                background: "linear-gradient(135deg, var(--watermelon) 0%, var(--punch) 100%)",
                boxShadow:
                  "0 6px 20px -6px color-mix(in oklch, var(--watermelon) 60%, transparent)",
              }}
            >
              <span
                aria-hidden
                className="absolute inset-[2px] rounded-md border border-white/20"
              />
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

      <main className="relative z-10 mx-auto flex max-w-xl flex-col items-center px-6 pt-8 pb-20">
        {state.status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <p className="font-mono text-xs tracking-wider uppercase">
              Checking for an existing wallet
            </p>
          </div>
        )}

        {state.status === "welcome" && (
          <form
            onSubmit={handleEnroll}
            className="flex w-full flex-col items-center gap-6 overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-[0_20px_60px_-20px_color-mix(in_oklch,var(--watermelon)_20%,transparent)]"
          >
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
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="font-display text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                Create your Helios wallet
              </h1>
              <p className="max-w-md text-balance text-sm text-muted-foreground">
                A passkey is your wallet. No seed phrase. No recovery sheet. Face ID, Touch ID, a
                security key, or your phone acting as one.
              </p>
            </div>

            {!webAuthnSupported && (
              <div
                role="alert"
                className="flex w-full items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>
                  Your browser does not support passkeys (WebAuthn). Try Chrome, Safari, Firefox, or
                  Edge on a device with Face ID, Touch ID, or Windows Hello.
                </p>
              </div>
            )}

            <div className="flex w-full flex-col gap-2">
              <label
                htmlFor="wallet-name"
                className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase"
              >
                Wallet name <span className="text-muted-foreground/60">optional</span>
              </label>
              <Input
                id="wallet-name"
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="Daily wallet"
                maxLength={60}
                autoComplete="off"
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Shown in your device's passkey prompt.
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={!webAuthnSupported}
              className="h-11 w-full border-0 bg-watermelon text-sm font-semibold text-watermelon-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--watermelon)_60%,transparent)] transition-transform hover:bg-punch hover:translate-y-[-1px]"
            >
              <Fingerprint className="mr-2 h-4 w-4" aria-hidden />
              Create with passkey
            </Button>
          </form>
        )}

        {state.status === "enrolling" && (
          <div className="flex w-full flex-col items-center gap-6 rounded-3xl border border-border bg-card p-10 shadow-[0_20px_60px_-20px_color-mix(in_oklch,var(--watermelon)_20%,transparent)]">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div
                aria-hidden
                className="absolute inset-0 animate-ping rounded-full bg-watermelon/20"
              />
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-full shadow-[0_14px_36px_-10px_color-mix(in_oklch,var(--punch)_60%,transparent)]"
                style={{
                  background: "linear-gradient(135deg, var(--watermelon), var(--punch))",
                }}
              >
                <Fingerprint className="h-7 w-7 text-white" aria-hidden />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Follow your browser prompt
              </h2>
              <p className="max-w-sm text-balance text-sm text-muted-foreground">
                Confirm the passkey with Face ID, Touch ID, or a security key. The private key stays
                on this device.
              </p>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex w-full flex-col items-center gap-6 rounded-3xl border border-destructive/30 bg-card p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
              <ShieldAlert className="h-7 w-7 text-destructive" aria-hidden />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Something stopped the setup
              </h2>
              <p className="max-w-md text-balance text-sm text-muted-foreground" role="alert">
                {state.message}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                size="lg"
                onClick={() => handleEnroll()}
                className="h-11 border-0 bg-watermelon text-sm font-semibold text-watermelon-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--watermelon)_60%,transparent)] hover:bg-punch"
              >
                Try again
              </Button>
              <Button variant="outline" size="lg" onClick={() => setState({ status: "welcome" })}>
                Back
              </Button>
            </div>
          </div>
        )}

        {state.status === "complete" && (
          <div className="flex w-full flex-col items-center gap-6 overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-[0_20px_60px_-20px_color-mix(in_oklch,var(--mint)_18%,transparent)] animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full shadow-[0_14px_36px_-10px_color-mix(in_oklch,var(--mint)_60%,transparent)]"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklch, var(--mint) 95%, white 5%), color-mix(in oklch, var(--mint) 70%, black 10%))",
              }}
            >
              <Check className="h-7 w-7 text-mint-foreground" aria-hidden />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-wider text-mint uppercase">
                <span className="h-px w-5 bg-mint" aria-hidden />
                Wallet ready
              </div>
              <h2 className="font-display text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                Your smart account is set
              </h2>
              <p className="max-w-md text-balance text-sm text-muted-foreground">
                Your passkey is stored on this device. The address below is the deterministic
                Soroban smart-account that Helios will deploy on first transaction.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/40 p-4">
                <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                  Smart-account address
                </span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all font-mono text-xs sm:text-sm">
                    {state.accountAddress}
                  </code>
                  <CopyButton value={state.accountAddress} label="account address" />
                </div>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/40 p-4">
                <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                  Public key
                </span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-xs sm:text-sm">
                    {truncatePublicKey(state.credential.publicKey, 10)}
                  </code>
                  <CopyButton value={state.credential.publicKey} label="public key" />
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="h-11 flex-1 border-0 bg-watermelon text-sm font-semibold text-watermelon-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--watermelon)_60%,transparent)] transition-transform hover:bg-punch hover:translate-y-[-1px]"
              >
                <Link href="/app/dashboard">Open wallet</Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="h-11 flex-1">
                <Link href="/">Back home</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
