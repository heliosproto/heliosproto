# Deploying the Helios factory to Soroban testnet

The factory contract (`contracts/factory`) deploys smart-account contracts at addresses derived deterministically from a passkey credential ID. This guide walks through deploying the factory and smart-account WASMs to Soroban testnet and verifying the deterministic deployment property on-chain.

## Prerequisites

- `stellar-cli` 26.1 or newer on `$PATH`
- `cargo` with the `wasm32-unknown-unknown` target installed
- `jq` for the verification step (optional)

## 1. Create a funded identity

```bash
stellar keys generate heliosproto-deployer --network testnet --fund
stellar keys address heliosproto-deployer
```

The `--fund` flag funds the account via the testnet friendbot.

## 2. Build the WASMs

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release \
  -p heliosproto-smart-account \
  -p heliosproto-factory
```

Current Rust toolchains emit the `reference-types` and `multivalue` wasm features by default. The soroban-env validator on current testnet protocol does not accept them, so the deploy script optimizes each WASM through `stellar contract optimize` before upload. The optimizer strips the unsupported features in addition to shrinking the binary.

## 3. Deploy

```bash
./scripts/deploy-factory.sh --network testnet --identity heliosproto-deployer --verify
```

The script:

1. Optimizes both WASMs to `*.optimized.wasm`.
2. Uploads the smart-account WASM, capturing its hash.
3. Uploads the factory WASM, capturing its hash.
4. Deploys a factory contract instance from the factory WASM hash.
5. Calls `factory.init(smart_account_wasm_hash)`.
6. Writes `contracts/deployments/testnet.json` with the deployer address, both WASM hashes, and the factory contract ID.
7. With `--verify`: calls `factory.predict_address(credential_id)` and then `factory.deploy_account(credential_id, pubkey)` for a sample credential, asserts the two addresses match, and appends the verification data to the deployments file.

## 4. First deployment on testnet

The initial deployment is recorded in `contracts/deployments/testnet.json`.

| | Value |
|---|---|
| Deployer | `GBWUF6VB7ZLK5EZI46SSPNNVWOM4X3X64KQYN6BCVILFD3AQMAIETKMC` |
| Smart-account WASM hash | `384450f525bbe877cbf3c41b0b1340ddb617d4d04a104c1ba8118d015e4cf0b6` |
| Factory WASM hash | `264d28a834c0198a38feca924413a8a3b3621d1fcf3f42fe7fdf5fdfa272eafa` |
| Factory contract ID | `CD5QVHYLGH3KYO6QHFSU4BRQ524VJJMDD7BGU7F4NO2U4BNJGWYWQVGH` |
| Sample credential (hex) | `68656c696f73707261746f2d64617931` |
| Sample deployed account | `CB3RGBH4SDH22ECLPLJUB3YMHX6RZWGJN3VSOBUFJ5XQRQVUBMF7DF4M` |

Verification on-chain:

- [`predict_address` invocation](https://stellar.expert/explorer/testnet/contract/CD5QVHYLGH3KYO6QHFSU4BRQ524VJJMDD7BGU7F4NO2U4BNJGWYWQVGH)
- [Factory on Stellar Lab](https://lab.stellar.org/r/testnet/contract/CD5QVHYLGH3KYO6QHFSU4BRQ524VJJMDD7BGU7F4NO2U4BNJGWYWQVGH)
- [Deployed smart-account on Stellar Lab](https://lab.stellar.org/r/testnet/contract/CB3RGBH4SDH22ECLPLJUB3YMHX6RZWGJN3VSOBUFJ5XQRQVUBMF7DF4M)

Both `predict_address` and `deploy_account` returned `CB3RGBH4SDH22ECLPLJUB3YMHX6RZWGJN3VSOBUFJ5XQRQVUBMF7DF4M` for the sample credential, proving the deterministic deployment property on-chain.

## 5. Invoking the factory manually

Predict an account address for an arbitrary credential ID:

```bash
stellar contract invoke \
  --id CD5QVHYLGH3KYO6QHFSU4BRQ524VJJMDD7BGU7F4NO2U4BNJGWYWQVGH \
  --network testnet \
  --source-account heliosproto-deployer \
  -- predict_address \
  --credential_id <hex-encoded credential ID>
```

Deploy a smart-account for a credential + public key pair:

```bash
stellar contract invoke \
  --id CD5QVHYLGH3KYO6QHFSU4BRQ524VJJMDD7BGU7F4NO2U4BNJGWYWQVGH \
  --network testnet \
  --source-account heliosproto-deployer \
  -- deploy_account \
  --credential_id <hex-encoded credential ID> \
  --pubkey <64-char hex-encoded 32-byte pubkey>
```
