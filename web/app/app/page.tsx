import { ArrowRight, Fingerprint, Gauge, Key, Puzzle, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Hero } from "@/components/landing/hero";
import { Button } from "@/components/ui/button";

const GITHUB_URL = "https://github.com/heliosproto/heliosproto";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <Features />
      <HowItWorks />
      <CtaBand />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
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
      <nav className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
        <Link href="#features" className="transition hover:text-foreground">
          Features
        </Link>
        <Link href="#how-it-works" className="transition hover:text-foreground">
          How it works
        </Link>
        <a
          href="https://github.com/heliosproto/heliosproto/blob/main/ROADMAP.md"
          className="transition hover:text-foreground"
        >
          Roadmap
        </a>
        <a href={GITHUB_URL} className="transition hover:text-foreground">
          GitHub
        </a>
      </nav>
      <Button
        asChild
        size="sm"
        className="h-8 border-0 bg-watermelon text-xs font-semibold text-watermelon-foreground hover:bg-punch"
      >
        <Link href="/app">Launch</Link>
      </Button>
    </header>
  );
}

const PLUGINS = [
  "session-keys",
  "social-recovery",
  "spending-limits",
  "allowlist",
  "time-lock",
  "paymaster",
];

function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-6 py-24">
      <div className="mb-14 max-w-2xl">
        <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium tracking-wider text-mint uppercase">
          <span className="h-px w-6 bg-mint" aria-hidden />
          What you get
        </div>
        <h2 className="font-display text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Everything a smart account can do.{" "}
          <span className="text-muted-foreground">In one wallet.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={Fingerprint}
          title="Passkey login"
          body="Sign in with Face ID, Touch ID, or a hardware key. No seed phrase to back up, lose, or screenshot. The device IS the wallet."
          className="lg:col-span-2 lg:row-span-2"
          featured
        />
        <FeatureCard
          icon={Key}
          title="Session keys"
          body="Grant a dApp a temporary signer with scope and expiry. Revoke anytime, right from settings."
        />
        <FeatureCard
          icon={Users}
          title="Social recovery"
          body="Rotate your primary signer with M-of-N guardian approval. No custodian, no help desk."
        />
        <FeatureCard
          icon={Gauge}
          title="Spending limits"
          body="Per-token, per-period caps enforced on-chain. If a signer leaks, the limit still holds."
        />
        <FeatureCard
          icon={Zap}
          title="Gasless flows"
          body="A paymaster covers transaction fees. Users can transact before holding a cent of XLM."
          className="md:col-span-2 lg:col-span-1"
        />
        <PluginsCard />
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  className,
  featured,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  body: string;
  className?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition hover:border-watermelon/40 ${className ?? ""}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 0%, color-mix(in oklch, var(--watermelon) 18%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="relative flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--watermelon) 22%, transparent), color-mix(in oklch, var(--mint) 10%, transparent))",
            border: "1px solid color-mix(in oklch, var(--watermelon) 25%, transparent)",
          }}
        >
          <Icon className="h-4 w-4 text-watermelon" aria-hidden />
        </div>
        <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
      </div>
      <p
        className={`relative mt-4 text-pretty text-sm leading-relaxed text-muted-foreground ${featured ? "lg:max-w-md lg:text-base" : ""}`}
      >
        {body}
      </p>
      {featured && (
        <div
          aria-hidden
          className="pointer-events-none mt-6 flex items-end justify-end"
          style={{ minHeight: "140px" }}
        >
          <div className="relative">
            <div
              className="absolute inset-0 rounded-[32px] blur-xl"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in oklch, var(--watermelon) 30%, transparent), transparent 70%)",
              }}
            />
            <div
              className="relative flex h-24 w-24 items-center justify-center rounded-[24px]"
              style={{
                background: "linear-gradient(135deg, var(--watermelon), var(--punch))",
                boxShadow: "0 20px 40px -16px color-mix(in oklch, var(--punch) 50%, transparent)",
              }}
            >
              <Fingerprint className="h-10 w-10 text-white" aria-hidden />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PluginsCard() {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition hover:border-mint/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 0%, color-mix(in oklch, var(--mint) 18%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="relative flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--mint) 22%, transparent), color-mix(in oklch, var(--watermelon) 10%, transparent))",
            border: "1px solid color-mix(in oklch, var(--mint) 25%, transparent)",
          }}
        >
          <Puzzle className="h-4 w-4 text-mint" aria-hidden />
        </div>
        <h3 className="font-display text-base font-semibold tracking-tight">Plugin policies</h3>
      </div>
      <p className="relative mt-4 text-pretty text-sm leading-relaxed text-muted-foreground">
        Compose your account from verified policy modules. Ship new rules without forking the core.
      </p>
      <ul className="relative mt-5 flex flex-wrap gap-1.5">
        {PLUGINS.map((plugin) => (
          <li
            key={plugin}
            className="rounded-md border border-border bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground backdrop-blur transition group-hover:border-mint/40 group-hover:text-foreground"
          >
            {plugin}
          </li>
        ))}
      </ul>
    </div>
  );
}

const STEPS = [
  {
    number: "01",
    title: "Create a passkey",
    body: "Face ID, Touch ID, or a security key. One tap. The private key never leaves the device.",
  },
  {
    number: "02",
    title: "Set your policies",
    body: "Add guardians, pick spending caps, install session-key plugins. Each policy is a Soroban contract.",
  },
  {
    number: "03",
    title: "Use the chain",
    body: "Send, receive, swap, and connect to Stellar dApps. Every signature runs through your rules on-chain.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative border-y border-border bg-muted/40">
      <div aria-hidden className="pointer-events-none absolute inset-0 helios-grid-bg opacity-50" />
      <div className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium tracking-wider text-watermelon uppercase">
            <span className="h-px w-6 bg-watermelon" aria-hidden />
            How it works
          </div>
          <h2 className="font-display text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Three steps. No seed phrase.
          </h2>
        </div>

        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step, idx) => (
            <li
              key={step.number}
              className="relative rounded-2xl border border-border bg-background p-6"
            >
              {idx < STEPS.length - 1 && (
                <div
                  aria-hidden
                  className="absolute top-10 -right-2 hidden h-px w-4 bg-border md:block"
                />
              )}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium tracking-widest text-watermelon">
                  {step.number}
                </span>
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{
                    background:
                      idx === 0 ? "var(--watermelon)" : idx === 1 ? "var(--punch)" : "var(--mint)",
                  }}
                />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, color-mix(in oklch, var(--watermelon) 10%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-20 text-center">
        <h2 className="font-display text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Spin up a wallet in under a minute.
        </h2>
        <p className="max-w-xl text-pretty text-base text-muted-foreground">
          Testnet-only alpha. No funds required. Create a passkey, see your deterministic C-address.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
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
          <Button asChild variant="outline" size="lg" className="h-11 px-5">
            <a href="https://github.com/heliosproto/heliosproto/blob/main/ROADMAP.md">
              See the roadmap
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-block h-5 w-5 rounded-md"
            style={{
              background: "linear-gradient(135deg, var(--watermelon) 0%, var(--punch) 100%)",
            }}
          />
          <span className="text-foreground">Helios</span>
          <span>&middot;</span>
          <span>Smart-account-native wallet for Stellar.</span>
        </div>
        <div className="flex gap-6">
          <a href={GITHUB_URL} className="transition hover:text-foreground">
            GitHub
          </a>
          <Link href="/app" className="transition hover:text-foreground">
            Wallet
          </Link>
          <a
            href="https://github.com/heliosproto/heliosproto/blob/main/ROADMAP.md"
            className="transition hover:text-foreground"
          >
            Roadmap
          </a>
        </div>
      </div>
    </footer>
  );
}
