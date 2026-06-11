# heliosproto

An open-source **smart-account-native wallet** for the Stellar ecosystem, built around Soroban C-addresses as the primary identity — not as an afterthought.

> **Status:** Early scaffolding. Nothing is production-ready yet. Tracking issues will be opened as components stabilize.

## What this is

The Stellar ecosystem has wallets, but they were all designed around classic G-addresses with smart-account support bolted on. `heliosproto` flips that: the smart account *is* the wallet. That unlocks:

- **Passkey login** — no seed phrase by default (recoverable via guardians)
- **Session keys** — sign once, let a dApp transact within bounded rules
- **Social recovery** — M-of-N guardian recovery, no centralized custodian
- **Spending limits & policies** — onchain rules enforced by the account itself
- **Sponsored transactions** — gasless flows via a paymaster
- **Plugin architecture** — accounts compose with verified policy modules

The flagship product shipped from this org is **Helios Wallet** — a web app + browser extension at Freighter feature parity, with smart-account native UX.

## Why this exists

This project directly targets the **C-Address Tooling RFP** under [Stellar Community Fund v7.0](https://stellar.gitbook.io/scf-handbook/scf-awards/build-award/rfp-track), which calls for:
1. A G→C seamless onboarding bridge so users can fund smart accounts without manually managing G-addresses
2. A production-grade C-address wallet at parity with Freighter

It also operates as a [Grantfox](https://grantfox.xyz) and [Drips Wave](https://drips.network/wave/stellar) participating repository — contributors are compensated in USDC per merged PR.

## Repository layout

```
contracts/                Rust + Soroban — onchain components
  smart-account/          core account contract (signer, nonce, exec)
  plugins/                policy modules
    session-keys/
    social-recovery/
    spending-limits/
    time-lock/
    allowlist/
  paymaster/              sponsored-transaction contract
  factory/                deterministic account deployment

web/                      TypeScript + Next.js 15 — user-facing
  app/                    wallet web app (PWA)
  extension/              Chrome/Firefox MV3 browser extension
  sdk-react/              publishable React hooks package

backend/                  Python 3.12 + FastAPI — services
  indexer/                Soroban event indexer
  relayer/                paymaster off-chain sponsor
  recovery/               guardian coordination service
  notifications/          WebSocket + push + email
  anchors/                SEP-24 / SEP-31 / SEP-10 adapters
  prices/                 Reflector + oracle adapters
  api/                    REST + GraphQL gateway
  workers/                background job processing

sdk-ts/                   framework-agnostic TypeScript SDK
sdk-py/                   Python SDK (for backend integrators)
docs/                     architecture, guides, SEP integration docs
```

Each pillar can be worked independently — pick the one that matches your stack.

## Quick start

Per-pillar setup lives in each subdirectory's README (coming online as scaffolding lands). At the project root:

```bash
# Coming soon: monorepo dev orchestration
```

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md). Short version: pick an open issue labeled `good-first-issue`, apply through Grantfox, get it assigned, ship a PR.

## License

[Apache License 2.0](./LICENSE).
