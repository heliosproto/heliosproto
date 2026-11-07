#!/usr/bin/env bash
#
# Deploy the Helios smart-account, session-keys, and factory contracts to a
# Soroban network, configure the factory to install the session-keys plugin
# on every account it deploys, and optionally verify the deterministic
# deployment property on-chain.
#
# Prerequisites:
#   - stellar-cli installed and on PATH
#   - a funded identity (default: heliosproto-deployer)
#   - WASM artifacts built: `cargo build --target wasm32-unknown-unknown --release`
#
# Usage:
#   ./scripts/deploy-factory.sh [--network testnet] [--identity heliosproto-deployer] [--verify]
#
# With --verify, the script also deploys a sample smart-account via the factory
# and asserts that factory.predict_address() returns the same address the
# on-chain deploy actually lands at, and that the deployed account reports the
# session-keys plugin address.
#
# Deployment metadata (contract IDs, wasm hashes, network) is written to
# contracts/deployments/<network>.json.

set -euo pipefail

NETWORK="testnet"
IDENTITY="heliosproto-deployer"
VERIFY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --network) NETWORK="$2"; shift 2 ;;
    --identity) IDENTITY="$2"; shift 2 ;;
    --verify) VERIFY=1; shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WASM_DIR="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release"
SMART_ACCOUNT_WASM="$WASM_DIR/heliosproto_smart_account.wasm"
FACTORY_WASM="$WASM_DIR/heliosproto_factory.wasm"
SESSION_KEYS_WASM="$WASM_DIR/heliosproto_session_keys.wasm"
SMART_ACCOUNT_OPTIMIZED="$WASM_DIR/heliosproto_smart_account.optimized.wasm"
FACTORY_OPTIMIZED="$WASM_DIR/heliosproto_factory.optimized.wasm"
SESSION_KEYS_OPTIMIZED="$WASM_DIR/heliosproto_session_keys.optimized.wasm"
DEPLOYMENTS_DIR="$CONTRACTS_DIR/deployments"
DEPLOYMENT_FILE="$DEPLOYMENTS_DIR/$NETWORK.json"

mkdir -p "$DEPLOYMENTS_DIR"

for wasm in "$SMART_ACCOUNT_WASM" "$FACTORY_WASM" "$SESSION_KEYS_WASM"; do
  if [[ ! -f "$wasm" ]]; then
    echo "missing WASM: $wasm" >&2
    echo "run: cargo build --target wasm32-unknown-unknown --release -p heliosproto-smart-account -p heliosproto-factory -p heliosproto-session-keys" >&2
    exit 1
  fi
done

say() { printf "\n==> %s\n" "$*"; }

say "Optimizing WASMs (strips features unsupported by current soroban-env)"
stellar contract optimize --wasm "$SMART_ACCOUNT_WASM" --wasm-out "$SMART_ACCOUNT_OPTIMIZED" 2>&1 | grep -E 'Optimized|error' || true
stellar contract optimize --wasm "$FACTORY_WASM" --wasm-out "$FACTORY_OPTIMIZED" 2>&1 | grep -E 'Optimized|error' || true
stellar contract optimize --wasm "$SESSION_KEYS_WASM" --wasm-out "$SESSION_KEYS_OPTIMIZED" 2>&1 | grep -E 'Optimized|error' || true

say "Deployer address"
DEPLOYER_ADDRESS=$(stellar keys address "$IDENTITY")
echo "$DEPLOYER_ADDRESS"

say "Uploading smart-account WASM"
SMART_ACCOUNT_HASH=$(stellar contract upload \
  --wasm "$SMART_ACCOUNT_OPTIMIZED" \
  --network "$NETWORK" \
  --source-account "$IDENTITY")
echo "wasm_hash: $SMART_ACCOUNT_HASH"

say "Uploading factory WASM"
FACTORY_HASH=$(stellar contract upload \
  --wasm "$FACTORY_OPTIMIZED" \
  --network "$NETWORK" \
  --source-account "$IDENTITY")
echo "wasm_hash: $FACTORY_HASH"

say "Uploading session-keys WASM"
SESSION_KEYS_HASH=$(stellar contract upload \
  --wasm "$SESSION_KEYS_OPTIMIZED" \
  --network "$NETWORK" \
  --source-account "$IDENTITY")
echo "wasm_hash: $SESSION_KEYS_HASH"

say "Deploying session-keys contract"
SESSION_KEYS_ID=$(stellar contract deploy \
  --wasm-hash "$SESSION_KEYS_HASH" \
  --network "$NETWORK" \
  --source-account "$IDENTITY")
echo "contract_id: $SESSION_KEYS_ID"

say "Deploying factory contract"
FACTORY_ID=$(stellar contract deploy \
  --wasm-hash "$FACTORY_HASH" \
  --network "$NETWORK" \
  --source-account "$IDENTITY")
echo "contract_id: $FACTORY_ID"

say "Initializing factory with smart-account wasm hash"
stellar contract invoke \
  --id "$FACTORY_ID" \
  --network "$NETWORK" \
  --source-account "$IDENTITY" \
  -- init \
  --smart_account_wasm_hash "$SMART_ACCOUNT_HASH"

say "Configuring factory with session-keys plugin address"
stellar contract invoke \
  --id "$FACTORY_ID" \
  --network "$NETWORK" \
  --source-account "$IDENTITY" \
  -- set_session_keys_plugin \
  --plugin_address "$SESSION_KEYS_ID"

cat > "$DEPLOYMENT_FILE" <<EOF
{
  "network": "$NETWORK",
  "deployer": "$DEPLOYER_ADDRESS",
  "smart_account_wasm_hash": "$SMART_ACCOUNT_HASH",
  "factory_wasm_hash": "$FACTORY_HASH",
  "session_keys_wasm_hash": "$SESSION_KEYS_HASH",
  "session_keys_contract_id": "$SESSION_KEYS_ID",
  "factory_contract_id": "$FACTORY_ID"
}
EOF
say "Wrote $DEPLOYMENT_FILE"
cat "$DEPLOYMENT_FILE"

if [[ "$VERIFY" -eq 1 ]]; then
  say "Verifying predict_address == deploy_account on-chain"

  CRED_HEX="68656c696f73707261746f2d64617937"
  PUBKEY_HEX="$(printf '01%.0s' {1..32})"

  PREDICTED=$(stellar contract invoke \
    --id "$FACTORY_ID" \
    --network "$NETWORK" \
    --source-account "$IDENTITY" \
    -- predict_address \
    --credential_id "$CRED_HEX")
  PREDICTED=$(echo "$PREDICTED" | tr -d '"')
  echo "predicted: $PREDICTED"

  DEPLOYED=$(stellar contract invoke \
    --id "$FACTORY_ID" \
    --network "$NETWORK" \
    --source-account "$IDENTITY" \
    -- deploy_account \
    --credential_id "$CRED_HEX" \
    --pubkey "$PUBKEY_HEX")
  DEPLOYED=$(echo "$DEPLOYED" | tr -d '"')
  echo "deployed:  $DEPLOYED"

  if [[ "$PREDICTED" != "$DEPLOYED" ]]; then
    echo "FAIL: predicted != deployed" >&2
    exit 1
  fi
  say "OK: predicted address matches deployed address"

  say "Verifying deployed account has session-keys plugin wired"
  INSTALLED=$(stellar contract invoke \
    --id "$DEPLOYED" \
    --network "$NETWORK" \
    --source-account "$IDENTITY" \
    -- session_keys_plugin)
  INSTALLED=$(echo "$INSTALLED" | tr -d '"')
  echo "installed plugin: $INSTALLED"

  if [[ "$INSTALLED" != "$SESSION_KEYS_ID" ]]; then
    echo "FAIL: deployed account does not have session-keys plugin wired" >&2
    exit 1
  fi
  say "OK: deployed account points at session-keys plugin"

  jq --arg account "$DEPLOYED" \
     --arg cred "$CRED_HEX" \
     '. + {verification: {credential_id_hex: $cred, deployed_account: $account, plugin_wired: true}}' \
     "$DEPLOYMENT_FILE" > "$DEPLOYMENT_FILE.tmp" && mv "$DEPLOYMENT_FILE.tmp" "$DEPLOYMENT_FILE"
fi

say "Done"
