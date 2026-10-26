"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { loadCredential, type StoredCredential, storeCredential } from "@/lib/credential-store";
import { createPasskey, type PasskeyCredential, truncatePublicKey } from "@/lib/passkey";
import { predictAccountAddress } from "@/lib/predict-address";

type OnboardingState =
  | { status: "loading" }
  | { status: "idle" }
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

export default function OnboardPage() {
  const [state, setState] = useState<OnboardingState>({ status: "loading" });

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
          setState({ status: "idle" });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "idle" });
        }
      }
    }

    checkExistingCredential();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateWallet = useCallback(async () => {
    setState({ status: "enrolling" });

    try {
      const passkey = await createPasskey();

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
          message: "Passkey creation was cancelled. Please try again when you are ready.",
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
  }, []);

  if (state.status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-12">
        <p className="text-neutral-500">Loading...</p>
      </main>
    );
  }

  if (state.status === "complete") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-12">
        <h1 className="text-3xl font-semibold tracking-tight">Wallet Created</h1>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 p-6 dark:border-neutral-700">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-neutral-500">Public Key</span>
            <code className="font-mono text-sm">
              {truncatePublicKey(state.credential.publicKey)}
            </code>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-neutral-500">Predicted Account Address</span>
            <code className="break-all font-mono text-sm">{state.accountAddress}</code>
          </div>
        </div>
        <p className="max-w-md text-center text-sm text-neutral-500">
          Fund this address to start using your Helios wallet. Your passkey is stored securely on
          this device.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-12">
      <h1 className="text-3xl font-semibold tracking-tight">Create Your Wallet</h1>
      <p className="max-w-md text-center text-neutral-500">
        Helios uses a passkey as your wallet identity. No seed phrases needed. Your passkey stays on
        this device.
      </p>

      {state.status === "error" && (
        <p role="alert" className="max-w-md text-center text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}

      <Button onClick={handleCreateWallet} disabled={state.status === "enrolling"}>
        {state.status === "enrolling" ? "Creating..." : "Create Wallet"}
      </Button>
    </main>
  );
}
