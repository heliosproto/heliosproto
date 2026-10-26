# heliosproto

An open-source smart-account-native wallet for the Stellar ecosystem, built around Soroban C-addresses as the primary identity.

> **Status: v0.1.0-alpha, in active development.** Smart-account core contract, `allowlist` and `spending-limits` plugins are implemented and unit tested. Passkey enrollment (WebAuthn) is shipping to testnet. Full architecture: [ARCHITECTURE.md](./ARCHITECTURE.md).

## What this is

Existing Stellar wallets (Freighter, Lobstr, xBull) are G-address first, with smart-account support bolted on. `heliosproto` flips that: the smart account *is* the wallet. That unlocks:

- **Passkey login.** No seed phrase by default. Recoverable via guardians.
- **Session keys.** Sign once, let a dApp transact within bounded rules.
- **Social recovery.** M-of-N guardian recovery, no centralized custodian.
- **Spending limits.** Per-token, per-period caps enforced on-chain.
- **Sponsored transactions.** Gasless flows via a paymaster.
- **Plugin architecture.** Accounts compose with verified policy modules.

The flagship product shipped from this org is **Helios Wallet**, a web app and browser extension at Freighter feature parity with smart-account native UX.

## Why this exists

This project targets the **C-Address Tooling RFP** under [Stellar Community Fund v7.0](https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/rfp-track):

1. A G→C seamless onboarding bridge so users can fund smart accounts without manually managing G-addresses.
2. A production-grade C-address wallet at parity with Freighter.

Full architectural response in [ARCHITECTURE.md section 8](./ARCHITECTURE.md#8-scf-rfp-deliverable-mapping).

## What works today

| Component | Status |
|---|---|
| Smart-account core contract | Implemented + unit tested |
| `allowlist` plugin | Implemented + unit tested |
| `spending-limits` plugin | Implemented + unit tested |
| `session-keys` plugin | Policy trait scaffolded |
| `social-recovery` plugin | Planned |
| `time-lock` plugin | Planned |
| `paymaster` contract | Planned |
| `factory` contract | Planned |
| Web app (Next.js 15, Tailwind 4, shadcn/ui) | Route scaffolds for dashboard, send, receive, history, settings, onboard |
| Browser extension (MV3) | Scaffolded |
| Dark mode | Implemented |
| Send-transaction flow | In progress |
| Passkey enrollment | In progress |
| Backend (FastAPI, Postgres, Redis) | Docker Compose stack running, health endpoint live |
| Indexer, relayer, recovery, notifications | Service skeletons |

## Repository layout

```
contracts/      Rust + Soroban onchain components
  smart-account/   core account contract (signer, nonce, exec)
  plugins/         policy modules (session-keys, social-recovery, spending-limits, time-lock, allowlist)
  paymaster/       sponsored-transaction contract
  factory/         deterministic account deployment

web/            TypeScript + Next.js 15 user-facing
  app/             wallet web app (PWA)
  extension/       Chrome/Firefox MV3 browser extension
  sdk-react/       publishable React hooks package

backend/        Python 3.12 + FastAPI services
  indexer/         Soroban event indexer
  relayer/         paymaster off-chain sponsor
  recovery/        guardian coordination service
  notifications/   WebSocket + push + email
  anchors/         SEP-24 / SEP-31 / SEP-10 adapters
  prices/          Reflector + oracle adapters
  api/             REST + GraphQL gateway
  workers/         background job processing

sdk-ts/         framework-agnostic TypeScript SDK
sdk-py/         Python SDK
docs/           architecture, guides, SEP integration docs
```

Each pillar can be worked independently. Pick the one that matches your stack.

## Quick start

```bash
# Clone
gh repo clone heliosproto/heliosproto
cd heliosproto

# Web app (requires pnpm, Node 22+)
cd web && pnpm install && pnpm dev
# open http://localhost:3000

# Contracts (requires Rust + wasm32 target)
cd contracts
cargo test
cargo build --target wasm32-unknown-unknown --release

# Backend (requires Docker)
cd backend && docker compose up -d
# health: http://localhost:8000/health
```

Per-pillar details: [`web/README.md`](./web/README.md), [`contracts/README.md`](./contracts/README.md), [`backend/README.md`](./backend/README.md).

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md). Short version: pick an open issue labeled `good-first-issue`, apply through [Grantfox](https://grantfox.xyz), get it assigned, ship a PR. Contributors are compensated in USDC per merged PR.

## License

[Apache License 2.0](./LICENSE).
