# Deploying the Helios factory to Soroban testnet

The factory contract (`contracts/factory`) deploys smart-account contracts at addresses derived deterministically from a passkey credential ID. Each new smart-account is automatically wired to a session-keys plugin so that session-key auth can be enforced on-chain the moment the account exists.

This guide walks through deploying all three contracts (smart-account, session-keys, factory) to Soroban testnet and verifying both the deterministic deployment property and the plugin wiring on-chain.

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
  -p heliosproto-factory \
  -p heliosproto-session-keys
```

Current Rust toolchains emit the `reference-types` and `multivalue` wasm features by default. The soroban-env validator on current testnet protocol does not accept them, so the deploy script optimizes each WASM through `stellar contract optimize` before upload. The optimizer strips the unsupported features in addition to shrinking the binary.

## 3. Deploy

```bash
./scripts/deploy-factory.sh --network testnet --identity heliosproto-deployer --verify
```

The script:

1. Optimizes all three WASMs to `*.optimized.wasm`.
2. Uploads smart-account, factory, and session-keys WASMs, capturing each hash.
3. Deploys the session-keys contract.
4. Deploys the factory contract.
5. Calls `factory.init(smart_account_wasm_hash)`.
6. Calls `factory.set_session_keys_plugin(session_keys_contract_id)` so every subsequent `deploy_account` installs the plugin in the new account's `init`.
7. Writes `contracts/deployments/testnet.json` with all deployer, WASM, and contract metadata.
8. With `--verify`: calls `factory.predict_address(credential_id)` and `factory.deploy_account(credential_id, pubkey)` for a sample credential, asserts the two addresses match, then queries the deployed account's `session_keys_plugin()` view and asserts it equals the session-keys contract address.

## 4. Current deployment on testnet

Recorded in `contracts/deployments/testnet.json`.

| | Value |
|---|---|
| Deployer | `GBWUF6VB7ZLK5EZI46SSPNNVWOM4X3X64KQYN6BCVILFD3AQMAIETKMC` |
| Smart-account WASM hash | `b2a021e2b16c92c33e1815e9b4d3f239f0f8ff4f1198bd14d77f97c23d95b486` |
| Factory WASM hash | `84f783f96fed20fde48b1b70ef1aad9472bf0ba0ecfc04e030cee81f985a4d3f` |
| Session-keys WASM hash | `312823b4418f21971f99f56d31a15ded9e43e113462888887241f1d7536d733f` |
| Factory contract ID | `CDF4P7N4QGYOH4NYSTJR4SJFE5SQXGD2LXSNBQWMI5MOS35KLCNUGU2S` |
| Session-keys contract ID | `CCT6CXGBMVTCN62JDEIU5O3SXJI3R7KTWOPC5F2MSGINCTPUYXKKURNH` |
| Sample credential (hex) | `68656c696f73707261746f2d64617937` |
| Sample deployed account | `CDIIWUWVDGCWYIZHBOMAFXRE3UVMSMCFSGYTGNQBFU2DRQKSLWP5LHFU` |

Verification on-chain:

- [Factory on Stellar Lab](https://lab.stellar.org/r/testnet/contract/CDF4P7N4QGYOH4NYSTJR4SJFE5SQXGD2LXSNBQWMI5MOS35KLCNUGU2S)
- [Session-keys on Stellar Lab](https://lab.stellar.org/r/testnet/contract/CCT6CXGBMVTCN62JDEIU5O3SXJI3R7KTWOPC5F2MSGINCTPUYXKKURNH)
- [Deployed smart-account on Stellar Lab](https://lab.stellar.org/r/testnet/contract/CDIIWUWVDGCWYIZHBOMAFXRE3UVMSMCFSGYTGNQBFU2DRQKSLWP5LHFU)

The deployed account's `session_keys_plugin()` returns `CCT6CXGBMVTCN62JDEIU5O3SXJI3R7KTWOPC5F2MSGINCTPUYXKKURNH`, confirming the factory wired the plugin at account creation.

The earlier plugin-less deployment from Day 2 remains live at factory `CD5QVHYLGH3KYO6QHFSU4BRQ524VJJMDD7BGU7F4NO2U4BNJGWYWQVGH` for reference; the web client points at the plugin-wired factory above.

## 5. Invoking the factory manually

Predict an account address for an arbitrary credential ID:

```bash
stellar contract invoke \
  --id CDF4P7N4QGYOH4NYSTJR4SJFE5SQXGD2LXSNBQWMI5MOS35KLCNUGU2S \
  --network testnet \
  --source-account heliosproto-deployer \
  -- predict_address \
  --credential_id <hex-encoded credential ID>
```

Deploy a smart-account for a credential + public key pair:

```bash
stellar contract invoke \
  --id CDF4P7N4QGYOH4NYSTJR4SJFE5SQXGD2LXSNBQWMI5MOS35KLCNUGU2S \
  --network testnet \
  --source-account heliosproto-deployer \
  -- deploy_account \
  --credential_id <hex-encoded credential ID> \
  --pubkey <64-char hex-encoded 32-byte pubkey>
```

Query the installed plugin on a deployed account:

```bash
stellar contract invoke \
  --id <deployed account address> \
  --network testnet \
  --source-account heliosproto-deployer \
  -- session_keys_plugin
```
