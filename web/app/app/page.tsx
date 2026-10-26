import Link from "next/link";
import { Button } from "@/components/ui/button";

const GITHUB_URL = "https://github.com/heliosproto/heliosproto";
const SCF_URL =
  "https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/rfp-track";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-md bg-gradient-to-br from-amber-400 to-orange-600"
            aria-hidden
          />
          <span className="text-base font-semibold tracking-tight">Helios</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground sm:flex">
          <Link href="#features" className="transition hover:text-foreground">
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="transition hover:text-foreground"
          >
            How it works
          </Link>
          <a href={GITHUB_URL} className="transition hover:text-foreground">
            GitHub
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <a href={GITHUB_URL}>Source</a>
          </Button>
          <Button size="sm" asChild>
            <Link href="/app">Launch</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 pb-16 pt-16 text-center sm:pt-24">
        <span className="rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground">
          v0.1.0 alpha, testnet only
        </span>
        <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
          The Stellar wallet where smart accounts are the point.
        </h1>
        <p className="max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
          Helios Wallet treats your Soroban smart account as the primary
          identity. Passkey login, session keys, social recovery, and spending
          limits enforced on-chain. No seed phrase by default.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/app">Launch wallet (testnet)</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href={GITHUB_URL}>View on GitHub</a>
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span>Apache 2.0</span>
          <span className="hidden sm:inline" aria-hidden>
            ·
          </span>
          <a
            href={SCF_URL}
            className="transition hover:text-foreground"
          >
            Stellar Community Fund v7.0 track
          </a>
          <span className="hidden sm:inline" aria-hidden>
            ·
          </span>
          <span>Smart-account native</span>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-6xl px-6 py-16"
        aria-labelledby="features-heading"
      >
        <h2
          id="features-heading"
          className="sr-only"
        >
          Features
        </h2>
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-12 text-center text-sm text-muted-foreground">
          Features section lands next.
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-6xl px-6 py-16"
        aria-labelledby="how-it-works-heading"
      >
        <h2 id="how-it-works-heading" className="sr-only">
          How it works
        </h2>
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-12 text-center text-sm text-muted-foreground">
          How-it-works section lands next.
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>
            Helios, open-source smart-account-native wallet for Stellar.
          </span>
          <div className="flex gap-6">
            <a href={GITHUB_URL} className="transition hover:text-foreground">
              GitHub
            </a>
            <Link href="/app" className="transition hover:text-foreground">
              Wallet
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
