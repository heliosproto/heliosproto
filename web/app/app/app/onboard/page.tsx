"use client";

import { ArrowLeft, Check, Copy, Fingerprint, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
        /* clipboard not available, ignore */
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
        <Check className="h-3.5 w-3.5 text-pink-500" aria-hidden />
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

          setState({
            status: "complete",
            credential: passkey,
            accountAddress,
          });
        } else {
          setState({ status: "welcome" });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "welcome" });
        }
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

        setState({
          status: "complete",
          credential: passkey,
          accountAddress,
        });
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
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-16 -z-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-gradient-to-br from-pink-500/25 via-fuchsia-500/20 to-rose-400/10 blur-3xl animate-helios-blob"
      />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-md bg-gradient-to-br from-pink-400 via-rose-500 to-fuchsia-600 shadow-lg shadow-pink-500/30"
            aria-hidden
          />
          <span className="text-base font-semibold tracking-tight">Helios</span>
        </Link>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden /> Back home
          </Link>
        </Button>
      </header>

      <main className="relative z-10 mx-auto flex max-w-xl flex-col items-center px-6 pt-8 pb-20">
        {state.status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <p className="text-sm">Checking for an existing wallet on this device</p>
          </div>
        )}

        {state.status === "welcome" && (
          <form
            onSubmit={handleEnroll}
            className="flex w-full flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 shadow-xl shadow-pink-500/5"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/15 via-rose-500/10 to-fuchsia-500/10">
              <Fingerprint className="h-7 w-7 text-pink-500" aria-hidden />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                Create your Helios wallet
              </h1>
              <p className="max-w-md text-balance text-sm text-muted-foreground">
                A passkey is your wallet. No seed phrase. No recovery sheet. Face ID, Touch ID, or a
                hardware key, right on this device.
              </p>
            </div>

            {!webAuthnSupported && (
              <div
                role="alert"
                className="flex w-full items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>
                  Your browser does not support passkeys (WebAuthn). Try Chrome, Safari, Firefox, or
                  Edge on a device with Face ID, Touch ID, or Windows Hello.
                </p>
              </div>
            )}

            <div className="flex w-full flex-col gap-2">
              <label htmlFor="wallet-name" className="text-xs font-medium text-muted-foreground">
                Wallet name (optional)
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
                Shown in your device's passkey prompt. You can leave this blank.
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={!webAuthnSupported}
              className="w-full bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600 text-white shadow-lg shadow-pink-500/30 hover:from-pink-500 hover:via-rose-600 hover:to-fuchsia-700"
            >
              <Fingerprint className="mr-2 h-4 w-4" aria-hidden />
              Create with passkey
            </Button>
          </form>
        )}

        {state.status === "enrolling" && (
          <div className="flex w-full flex-col items-center gap-6 rounded-2xl border border-border bg-card p-10 shadow-xl shadow-pink-500/5">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div
                aria-hidden
                className="absolute inset-0 animate-ping rounded-full bg-pink-500/20"
              />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600 shadow-lg shadow-pink-500/40">
                <Fingerprint className="h-7 w-7 text-white" aria-hidden />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-xl font-semibold tracking-tight">Follow your browser prompt</h2>
              <p className="max-w-sm text-balance text-sm text-muted-foreground">
                Confirm the passkey with Face ID, Touch ID, or a security key. It stays on this
                device.
              </p>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex w-full flex-col items-center gap-6 rounded-2xl border border-destructive/30 bg-card p-8 shadow-xl shadow-destructive/5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-7 w-7 text-destructive" aria-hidden />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-xl font-semibold tracking-tight">Something stopped the setup</h2>
              <p className="max-w-md text-balance text-sm text-muted-foreground" role="alert">
                {state.message}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                size="lg"
                onClick={() => handleEnroll()}
                className="bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600 text-white shadow-lg shadow-pink-500/30 hover:from-pink-500 hover:via-rose-600 hover:to-fuchsia-700"
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
          <div className="flex w-full flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 shadow-xl shadow-pink-500/5 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600 shadow-lg shadow-pink-500/40">
              <Check className="h-7 w-7 text-white" aria-hidden />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                Wallet ready
              </h2>
              <p className="max-w-md text-balance text-sm text-muted-foreground">
                Your passkey is stored on this device. Below is the smart-account address Helios
                will deploy for you on first use.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-4">
                <span className="text-xs font-medium text-muted-foreground">
                  Smart-account address (Soroban testnet)
                </span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all font-mono text-xs sm:text-sm">
                    {state.accountAddress}
                  </code>
                  <CopyButton value={state.accountAddress} label="account address" />
                </div>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-4">
                <span className="text-xs font-medium text-muted-foreground">Public key</span>
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
                className="flex-1 bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600 text-white shadow-lg shadow-pink-500/30 hover:from-pink-500 hover:via-rose-600 hover:to-fuchsia-700"
              >
                <Link href="/app/dashboard">Open wallet</Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="flex-1">
                <Link href="/">Back home</Link>
              </Button>
            </div>

            <p className="text-balance text-center text-xs text-muted-foreground">
              Deployment to Soroban testnet happens on first transaction. Account is non-custodial.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
