# Developer setup guide

This guide gets a new contributor from a clean machine to all three Helios pillars building or testing locally. Use it for a first-day setup before taking a GrantFox issue.

## 1. Clone the repository

```bash
git clone https://github.com/heliosproto/heliosproto.git
cd heliosproto
```

Read [ARCHITECTURE.md](../../ARCHITECTURE.md) first so you know which pillar your issue touches:

- `contracts/` - Rust and Soroban smart-account contracts.
- `web/` - Next.js app, browser extension, and React SDK workspace.
- `backend/` - FastAPI services, Postgres, Redis, and workers.

## 2. Install shared tools

### Rust and Soroban

Install Rust with `rustup`, then add the WebAssembly target used by Soroban contracts:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
rustup component add rustfmt clippy
```

Install the Stellar CLI:

```bash
cargo install --locked stellar-cli --features opt
```

The contracts workspace pins its Rust components in `contracts/rust-toolchain.toml`; `rustup` will honor that file when you run commands under `contracts/`.

### Node and pnpm

Install Node.js 20 or newer. Then enable Corepack and activate the pnpm version declared in `web/package.json`:

```bash
corepack enable
cd web
corepack prepare pnpm@10.15.1 --activate
pnpm --version
cd ..
```

### Python and uv

Install Python 3.10 or newer. The backend package declares `requires-python = ">=3.10"` in `backend/api/pyproject.toml`.

Install `uv` for fast, isolated Python environments:

```bash
python -m pip install --user uv
```

### Docker

Install Docker Desktop on macOS or Docker Engine on Linux. The backend compose stack starts Postgres 16, Redis 7, and the API service from `backend/docker-compose.yml`.

## 3. Verify the contracts pillar

```bash
cd contracts
cargo test
cargo build --target wasm32-unknown-unknown --release
cd ..
```

Use `cargo fmt` and `cargo clippy -- -D warnings` before opening a contract PR.

## 4. Verify the web pillar

```bash
cd web
pnpm install
pnpm -r build
pnpm -r test
cd ..
```

For day-to-day app work, run:

```bash
cd web
pnpm dev
```

The root web workspace uses `pnpm.onlyBuiltDependencies` for packages such as `esbuild`, `sharp`, and Biome. If pnpm prompts about build-script approval, keep the allowlist in `web/package.json` as the source of truth.

## 5. Verify the backend pillar

Start the shared services:

```bash
cd backend
docker compose up -d postgres redis
cd ..
```

Create the API virtual environment and run tests:

```bash
cd backend/api
uv venv .venv
. .venv/bin/activate
uv pip install -e ".[dev]"
pytest
cd ../..
```

On Windows PowerShell, activate the virtual environment with:

```powershell
.\.venv\Scripts\Activate.ps1
```

To run the API manually:

```bash
cd backend/api
. .venv/bin/activate
uvicorn main:app --reload
```

Or boot the full backend compose stack:

```bash
cd backend
docker compose up --build
```

## 6. One-shot local verification

After the tools are installed, this command runs the main checks for all three pillars:

```bash
(cd contracts && cargo test) && \
(cd web && pnpm install && pnpm -r build && pnpm -r test) && \
(cd backend/api && uv venv .venv && . .venv/bin/activate && uv pip install -e ".[dev]" && pytest)
```

If your shell does not support `&&` continuations exactly as shown, run the three grouped commands separately.

## Common gotchas

- **Ubuntu PEP 668 / missing venv support:** if `uv venv` or `python -m venv` fails, install the distro package first: `sudo apt-get install python3-venv`.
- **macOS shell activation:** if `. .venv/bin/activate` is rejected, check that you are using `bash` or `zsh`, or run the activation script with an explicit shell.
- **pnpm build-script prompts:** the web workspace allowlist lives in `web/package.json` under `pnpm.onlyBuiltDependencies`. Do not approve unrelated packages without maintainer review.
- **First Soroban build is slow:** the first `cargo test` or `cargo build --target wasm32-unknown-unknown --release` can take several minutes while Rust compiles `soroban-sdk` and dependencies.
- **Docker ports already in use:** backend compose exposes Postgres on `5432`, Redis on `6379`, and the API on `8000`. Stop conflicting local services or remap ports before starting compose.

## Next step

Once the checks pass, return to [CONTRIBUTING.md](../../CONTRIBUTING.md), apply for a GrantFox issue, and open a focused PR whose body starts with `Closes #<issue-number>`.
