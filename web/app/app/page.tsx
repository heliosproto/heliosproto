import { Fingerprint, Gauge, Key, Puzzle, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const GITHUB_URL = "https://github.com/heliosproto/heliosproto";
const SCF_URL = "https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/rfp-track";

const FEATURES = [
  {
    icon: Fingerprint,
    title: "Passkey login",
    body: "Sign in with Face ID, Touch ID, or a hardware key. No seed phrase to lose, back up, or screenshot.",
  },
  {
    icon: Key,
    title: "Session keys",
    body: "Grant a dApp a temporary signer with scope and expiry. Revoke anytime, straight from the wallet.",
  },
  {
    icon: Users,
    title: "Social recovery",
    body: "Rotate your primary signer with M-of-N guardian approval. No central custodian, no help desk ticket.",
  },
  {
    icon: Gauge,
    title: "Spending limits",
    body: "Per-token, per-period caps enforced on-chain. If a signer is compromised, the limit still holds.",
  },
  {
    icon: Zap,
    title: "Gasless flows",
    body: "A paymaster covers transaction fees. Users can transact before they ever hold a cent of XLM.",
  },
  {
    icon: Puzzle,
    title: "Plugin policies",
    body: "Compose your account from verified policy modules. Ship new rules without forking the core contract.",
  },
] as const;

const STEPS = [
  {
    title: "Create",
    body: "Enroll a passkey. Your Soroban smart account deploys at a deterministic address, no XLM required to start.",
  },
  {
    title: "Protect",
    body: "Add guardians for recovery. Set daily spending caps. Install session-key plugins for the dApps you use most.",
  },
  {
    title: "Use",
    body: "Send, receive, swap, and connect to Stellar dApps. Every signature runs through your plugins and policies.",
  },
] as const;

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-md bg-gradient-to-br from-pink-400 via-rose-500 to-fuchsia-600 shadow-lg shadow-pink-500/30"
            aria-hidden
          />
          <span className="text-base font-semibold tracking-tight">Helios</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground sm:flex">
          <Link href="#features" className="transition hover:text-foreground">
            Features
          </Link>
          <Link href="#how-it-works" className="transition hover:text-foreground">
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

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-8 -z-0 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-br from-pink-500/40 via-fuchsia-500/30 to-rose-400/20 blur-3xl animate-helios-blob"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[12%] top-32 -z-0 h-[320px] w-[320px] rounded-full bg-gradient-to-br from-rose-400/30 to-pink-600/20 blur-3xl animate-helios-blob-reverse"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-[8%] top-56 -z-0 h-[280px] w-[280px] rounded-full bg-gradient-to-br from-fuchsia-400/25 to-pink-500/10 blur-3xl animate-helios-blob"
        />

        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 pb-16 pt-16 text-center sm:pt-24">
          <span className="animate-in fade-in-0 slide-in-from-bottom-4 rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur duration-700">
            v0.1.0 alpha, testnet only
          </span>
          <h1 className="max-w-4xl animate-in fade-in-0 slide-in-from-bottom-4 text-balance text-5xl font-semibold tracking-tight delay-100 duration-700 sm:text-6xl">
            The Stellar wallet where smart accounts are the point.
          </h1>
          <p className="max-w-2xl animate-in fade-in-0 slide-in-from-bottom-4 text-balance text-lg text-muted-foreground delay-200 duration-700 sm:text-xl">
            Helios Wallet treats your Soroban smart account as the primary identity. Passkey login,
            session keys, social recovery, and spending limits enforced on-chain. No seed phrase by
            default.
          </p>
          <div className="flex animate-in flex-col gap-3 fade-in-0 slide-in-from-bottom-4 delay-300 duration-700 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/app">Launch wallet (testnet)</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href={GITHUB_URL}>View on GitHub</a>
            </Button>
          </div>
          <div className="mt-6 flex animate-in flex-wrap items-center justify-center gap-x-6 gap-y-2 fade-in-0 text-xs text-muted-foreground delay-500 duration-1000">
            <span>Apache 2.0</span>
            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>
            <a href={SCF_URL} className="transition hover:text-foreground">
              Stellar Community Fund v7.0 track
            </a>
            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>
            <span>Smart-account native</span>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-6xl px-6 py-20"
        aria-labelledby="features-heading"
      >
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2
            id="features-heading"
            className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Everything a smart account can do, in a wallet that treats it as the point.
          </h2>
          <p className="mt-4 text-balance text-base text-muted-foreground sm:text-lg">
            Six primitives, enforced by Soroban contracts. No off-chain honor system.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition hover:border-pink-500/40 hover:shadow-lg hover:shadow-pink-500/5"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-br from-pink-500/0 via-rose-500/0 to-fuchsia-500/0 blur-2xl transition duration-500 group-hover:from-pink-500/30 group-hover:via-rose-500/20 group-hover:to-fuchsia-500/10"
              />
              <feature.icon
                className="relative mb-4 h-6 w-6 text-foreground/80 transition group-hover:text-foreground"
                aria-hidden
              />
              <h3 className="relative text-base font-semibold tracking-tight">{feature.title}</h3>
              <p className="relative mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="how-it-works"
        className="border-t border-border bg-muted/30"
        aria-labelledby="how-it-works-heading"
      >
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2
              id="how-it-works-heading"
              className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Three steps. No seed phrase.
            </h2>
            <p className="mt-4 text-balance text-base text-muted-foreground sm:text-lg">
              Enroll a passkey, set your policies, use any Stellar dApp. Every signature runs
              through your account's rules.
            </p>
          </div>
          <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-xl border border-border bg-background p-6 transition hover:border-pink-500/40"
              >
                <span className="-top-3 absolute left-6 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600 px-2 text-xs font-semibold text-white shadow-md shadow-pink-500/30">
                  {index + 1}
                </span>
                <h3 className="mt-2 text-base font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex justify-center">
            <Button size="lg" asChild>
              <Link href="/app/onboard">Create a wallet</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>Helios, open-source smart-account-native wallet for Stellar.</span>
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
