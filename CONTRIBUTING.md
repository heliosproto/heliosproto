# Contributing to heliosproto

We're glad you're here. `heliosproto` is built openly — every accepted PR earns a reward and counts toward both the contributor's and the maintainer's standing in the [Grantfox](https://grantfox.xyz) / [Drips Wave](https://drips.network/wave/stellar) programs.

## Before you start

1. **Read the [ARCHITECTURE.md](./ARCHITECTURE.md).** Understand which of the three pillars (contracts, web, backend) you're working in.
2. **Pick an open issue.** Browse [open issues](https://github.com/heliosproto/heliosproto/issues). Look for `good-first-issue` if you're new. Issues labeled `claimed-on-grantfox` are not available.
3. **Apply through Grantfox.** Don't comment "I'll take this" on the GitHub issue. Apply through Grantfox, where the maintainer reviews your profile and assigns the issue. This is what triggers the reward escrow.
4. **Wait for assignment.** Once Grantfox assigns the issue to you, it'll be auto-labeled here, and you can start.

## Reward flow (how you get paid)

1. You apply on Grantfox → maintainer assigns → issue is escrowed
2. You open a PR referencing the issue
3. Maintainer reviews; you address requested changes
4. PR merges → escrow releases USDC to your wallet
5. Both you and the maintainer accrue Grantfox points / Drips Wave points

You do **not** need a Stellar wallet to receive payment — Grantfox handles the rail. But once you're earning, having a smart-account wallet (like the one we're building) is a nice flex.

## Dev environment

The repo is a polyglot monorepo. You only need to set up the pillar you're working in.

**First day:** start with the [developer setup guide](./docs/guides/developer-setup.md) if you want one path that installs the shared tools and verifies the contracts, web, and backend pillars.

### Contracts (Rust + Soroban)

```bash
# Install Rust toolchain (if not already)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Install Stellar CLI
cargo install --locked stellar-cli --features opt

# From the repo root
cd contracts/smart-account
cargo test
```

Per-contract setup in each `contracts/*/README.md`.

### Web (Next.js + TS)

```bash
# Requires Node 20+ and pnpm 9+
corepack enable
cd web/app
pnpm install
pnpm dev
```

### Backend (Python + FastAPI)

```bash
# Requires Python 3.12+
cd backend/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Docker Compose orchestration for the full backend stack ships in `backend/docker-compose.yml` (coming soon).

## PR requirements

- **Branch name:** `<pillar>/<issue-number>-<short-slug>` — e.g., `contracts/42-add-allowlist-plugin`
- **One issue per PR.** Don't bundle unrelated changes.
- **Tests required** unless explicitly waived in the issue:
  - Rust: `cargo test` passes; new contract logic has unit tests
  - TS: `pnpm test` passes; new components have Storybook + a basic render test
  - Python: `pytest` passes; new endpoints have pytest-asyncio tests
- **No new top-level dependencies** without discussion. Comment on the issue first.
- **Conventional commits:** PR title follows `<type>(<scope>): <subject>` — e.g., `feat(contracts): add allowlist plugin`. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- **Reference the issue:** PR body starts with `Closes #<issue-number>`.
- **No drive-by formatting changes.** If you reformat untouched code, the PR will be rejected. Open a separate `chore: format` issue for that.

## Style

- **Rust:** `cargo fmt` + `cargo clippy -- -D warnings`. No `unwrap()` outside tests.
- **TypeScript:** Biome (config in repo root). No `any` without an inline `// biome-ignore` and a comment explaining why.
- **Python:** Ruff (config in `backend/pyproject.toml`). Type hints required on all public functions; `mypy --strict` clean.

## What we won't accept

- AI slop PRs. We can tell. Don't waste your application slot.
- Speculative refactors. Fix the issue you were assigned; don't reshape neighboring code.
- "I added comments to explain the code." If the code needs comments to read, propose a refactor first.
- Features the issue didn't ask for. Scope creep gets sent back.

## Getting help

- **Architecture questions:** open a GitHub Discussion in the `Q&A` category
- **Bug in main:** open an issue with the `bug` label
- **Security:** see [SECURITY.md](./SECURITY.md) — do not file a public issue

## Code of Conduct

By participating, you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md). Maintainers may reject contributions or applications that violate it; in egregious cases this includes reporting to Grantfox to bar future participation.
