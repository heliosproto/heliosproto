"use client";

import { ArrowRight, Github } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, type PointerEvent, useCallback, useState } from "react";
import { PasskeyCard } from "@/components/landing/passkey-card";
import { Button } from "@/components/ui/button";

const GITHUB_URL = "https://github.com/heliosproto/heliosproto";

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
                <Github className="mr-1 h-4 w-4" aria-hidden />
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
