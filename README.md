# ⚡ Helios

**A Stellar wallet where your smart account is the point.** Sign in with a passkey. Set spending limits that enforce on-chain. Recover without a seed phrase.

**Live:** [heliosproto.vercel.app](https://heliosproto.vercel.app)

![License](https://img.shields.io/badge/license-Apache_2.0-blue) ![Network](https://img.shields.io/badge/network-Stellar_Testnet-black) ![Status](https://img.shields.io/badge/status-v0.1.0--alpha-ec4899) ![Deployed](https://img.shields.io/badge/deployed-Vercel-black)

## 🎯 Why Helios

Every Stellar wallet today treats smart accounts as a bolt-on. You get a classic G-address, you juggle a seed phrase, you sign everything manually, and if you lose your phrase you lose your money.

Helios flips it. The smart account *is* the wallet. That unlocks four things classic wallets structurally cannot do:

- **No seed phrase.** Passkeys replace them. Face ID, Touch ID, or a security key.
- **No single point of failure.** Guardians can rotate your signer if your passkey is lost.
- **No approval fatigue.** Session keys let a dApp transact within rules you set once.
- **No gas anxiety.** A paymaster can cover fees so users transact before they ever hold XLM.

## ✨ Features

- **🔐 Passkey login.** Sign in with Face ID, Touch ID, or a hardware key. No seed phrase to back up, lose, or screenshot.
- **🔑 Session keys.** Grant a dApp a temporary signer with scope and expiry. Revoke anytime, straight from the wallet.
- **👥 Social recovery.** Rotate your primary signer with M-of-N guardian approval. No central custodian, no help desk ticket.
- **📊 Spending limits.** Per-token, per-period caps enforced on-chain by your account itself. If a signer is compromised, the limit still holds.
- **⚡ Gasless flows.** A paymaster covers transaction fees. Users can transact before they ever hold a cent of XLM.
- **🧩 Plugin policies.** Compose your account from verified policy modules. Ship new rules without forking the core contract.

## 🚀 Try it

**Hosted (fastest):** [heliosproto.vercel.app](https://heliosproto.vercel.app)

**Run locally:**

```bash
gh repo clone heliosproto/heliosproto
cd heliosproto/web && pnpm install && pnpm dev
# open http://localhost:3000
```

Requires Node 22+, pnpm 10+. Full dev setup across contracts, web, and backend pillars in [docs/guides/developer-setup.md](./docs/guides/developer-setup.md).

## 🛠️ Tech stack

- **Contracts:** Rust + Soroban SDK
- **Web:** Next.js 15, Tailwind 4, shadcn/ui, Biome
- **Backend:** FastAPI, Postgres, Redis, Celery
- **SDKs:** TypeScript, Python

## 🗺️ Roadmap

Component-by-component status in [ROADMAP.md](./ROADMAP.md). Full architecture, deployment topology, and open design questions in [ARCHITECTURE.md](./ARCHITECTURE.md).

## 🤝 Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md). Short version: pick an open issue labeled `good-first-issue`, apply through [Grantfox](https://grantfox.xyz), get it assigned, ship a PR. Contributors are compensated in USDC per merged PR.

## 🔒 Security

Found a vulnerability? See [SECURITY.md](./SECURITY.md) for responsible-disclosure scope and contact.

## 📜 License

[Apache License 2.0](./LICENSE).
