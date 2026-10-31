import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function AppHome() {
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
              <Link href="/">Back home</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-xl flex-col items-center px-6 pt-12 pb-20">
        <div className="w-full overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-[0_20px_60px_-20px_color-mix(in_oklch,var(--watermelon)_18%,transparent)]">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-wider text-mint uppercase">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-mint helios-pulse-dot" />
              Testnet alpha
            </div>
            <h1 className="font-display text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Welcome to Helios
            </h1>
            <p className="max-w-sm text-balance text-sm text-muted-foreground">
              Set up a passkey-backed smart account, or sign back in with one already registered on
              this device.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-2.5">
            <Button
              asChild
              size="lg"
              className="h-11 w-full border-0 bg-watermelon text-sm font-semibold text-watermelon-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--watermelon)_60%,transparent)] transition-transform hover:bg-punch hover:translate-y-[-1px]"
            >
              <Link href="/app/onboard">
                Set up your wallet
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 w-full">
              <Link href="/app/onboard">Sign in with existing passkey</Link>
            </Button>
          </div>

          <div className="mt-6 flex justify-center">
            <a
              href="https://github.com/heliosproto/heliosproto"
              className="font-mono text-[11px] text-muted-foreground tracking-wider underline-offset-4 transition hover:text-foreground hover:underline"
            >
              Source &middot; github.com/heliosproto
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
