"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, type PointerEvent, useCallback, useState } from "react";
import { PasskeyCard } from "@/components/landing/passkey-card";
import { Button } from "@/components/ui/button";

const GITHUB_URL = "https://github.com/heliosproto/heliosproto";

function GithubGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-labelledby="helios-github-icon"
      className={className}
    >
      <title id="helios-github-icon">GitHub</title>
      <path d="M12 .5C5.73.5.74 5.53.74 11.8c0 5.02 3.26 9.28 7.78 10.78.57.1.78-.25.78-.55v-1.92c-3.17.69-3.84-1.5-3.84-1.5-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.02 1.76 2.69 1.25 3.35.95.1-.74.4-1.25.72-1.54-2.53-.29-5.19-1.27-5.19-5.63 0-1.24.44-2.26 1.17-3.05-.12-.3-.51-1.46.11-3.05 0 0 .95-.3 3.11 1.16a10.7 10.7 0 0 1 5.65 0c2.16-1.46 3.11-1.16 3.11-1.16.62 1.59.23 2.75.11 3.05.73.79 1.17 1.81 1.17 3.05 0 4.37-2.66 5.33-5.2 5.62.41.35.78 1.03.78 2.09v3.1c0 .3.21.66.78.55 4.52-1.5 7.78-5.76 7.78-10.78C23.26 5.53 18.27.5 12 .5z" />
    </svg>
  );
}

type MouseState = { x: number; y: number } | null;

export function Hero() {
  const [mouse, setMouse] = useState<MouseState>(null);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setMouse({ x, y });
  }, []);

  const handlePointerLeave = useCallback(() => {
    setMouse(null);
  }, []);

  const glowStyle: CSSProperties = {
    "--helios-mouse-x": mouse ? `${mouse.x}%` : "50%",
    "--helios-mouse-y": mouse ? `${mouse.y}%` : "28%",
  } as CSSProperties;

  const tilt = mouse ? { x: (mouse.x - 50) / 10, y: -(mouse.y - 50) / 14 } : undefined;

  return (
    <section
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative overflow-hidden"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 helios-grid-bg" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 helios-hero-glow"
        style={glowStyle}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background"
      />

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 pt-16 pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:pt-24">
        <div className="flex flex-col items-start gap-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-mint helios-pulse-dot" aria-hidden />
            Testnet alpha, Soroban
          </div>

          <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-[64px]">
            Your smart account,{" "}
            <span className="relative inline-block whitespace-nowrap text-watermelon">
              finally
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-1 h-[6px] rounded-full"
                style={{
                  background: "linear-gradient(90deg, var(--watermelon) 0%, var(--punch) 100%)",
                  opacity: 0.35,
                }}
              />
            </span>{" "}
            the wallet.
          </h1>

          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Helios makes your Soroban smart account the primary identity, not a bolt-on. Sign in
            with a passkey. Set spending limits that enforce on-chain. Recover without a seed
            phrase.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-11 border-0 bg-watermelon px-5 text-sm font-semibold text-watermelon-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--watermelon)_60%,transparent)] transition-transform hover:bg-punch hover:translate-y-[-1px]"
            >
              <Link href="/app">
                Launch wallet
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 border-border px-5 text-sm font-medium"
            >
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                <GithubGlyph className="mr-1 h-4 w-4" />
                View source
              </a>
            </Button>
          </div>

          <dl className="grid grid-cols-3 gap-6 pt-4">
            <div className="flex flex-col gap-1">
              <dt className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Signer type
              </dt>
              <dd className="font-mono text-sm text-foreground">secp256r1</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Account kind
              </dt>
              <dd className="font-mono text-sm text-foreground">C-address</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                License
              </dt>
              <dd className="font-mono text-sm text-foreground">Apache 2.0</dd>
            </div>
          </dl>
        </div>

        <div className="relative flex items-center justify-center lg:justify-end">
          <div
            aria-hidden
            className="absolute -inset-10 -z-0 rounded-[48px]"
            style={{
              background:
                "radial-gradient(ellipse at center, color-mix(in oklch, var(--watermelon) 30%, transparent) 0%, transparent 70%)",
              filter: "blur(32px)",
            }}
          />
          <PasskeyCard className="relative z-10 w-full max-w-[380px]" tilt={tilt} />
        </div>
      </div>
    </section>
  );
}
