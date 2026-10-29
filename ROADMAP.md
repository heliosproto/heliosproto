# Roadmap

Component-by-component status for `heliosproto`. For the full architectural design and SCF v7.0 RFP alignment, see [ARCHITECTURE.md](./ARCHITECTURE.md).

**Legend**

- ✅ Implemented and unit tested
- 🚧 In progress
- 📋 Planned

## Contracts (Rust + Soroban)

| Component | Status |
|---|---|
| Smart-account core | ✅ Implemented + unit tested |
| `allowlist` plugin | ✅ Implemented + unit tested |
| `spending-limits` plugin | ✅ Implemented + unit tested |
| `session-keys` plugin | 🚧 Policy trait scaffolded |
| `social-recovery` plugin | 📋 Planned |
| `time-lock` plugin | 📋 Planned |
| `paymaster` contract | 📋 Planned |
| `factory` contract (deterministic deployment) | 📋 Planned |

## Web (Next.js 15, Tailwind 4, shadcn/ui)

| Component | Status |
|---|---|
| Landing page | ✅ Live at [heliosproto.vercel.app](https://heliosproto.vercel.app) |
| Dark mode | ✅ Implemented |
| Route scaffolds (`/app`, `/app/dashboard`, `/app/send`, `/app/receive`, `/app/history`, `/app/settings`, `/app/onboard`) | ✅ In place |
| Passkey enrollment flow | 🚧 In progress |
| Send-transaction flow with simulation preview | 🚧 In progress |
| Browser extension (MV3) | ✅ Scaffolded |

## Backend (FastAPI, Postgres, Redis)

| Component | Status |
|---|---|
| Docker Compose stack | ✅ Running |
| API health endpoint | ✅ Live |
| Indexer, relayer, recovery, notifications | 🚧 Service skeletons |
| G→C relayer (SCF RFP milestone) | 📋 Planned |
| SEP-10 web auth | 📋 Planned |
| SEP-24 anchor adapters | 📋 Planned |

## Milestones

- **v0.1.0-alpha.** First tagged release. Landing page live, WebAuthn passkey enrollment working on Soroban testnet, smart-account core and two plugins implemented and tested.
- **v0.2.0.** Full passkey to smart-account signer registration end-to-end on testnet. `social-recovery` and `time-lock` plugins. G→C relayer MVP so users can fund a C-address without touching a G-address.
- **v1.0.0.** Mainnet. Feature parity with Freighter: token display, history, dApp connect, send/receive, settings. All six plugins live. Hosted and self-hostable backend deployments documented.

## Contributing to the roadmap

Pick a 📋 item from the Contracts, Web, or Backend table and open an issue in the repository with the proposed design. For issues already labeled `good-first-issue`, apply through [Grantfox](https://grantfox.xyz).
