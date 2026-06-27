# ADR-001: Plugin Architecture

**Status:** Accepted

---

## Context

Smart account contracts need to support evolving auth policies — session keys for dApps, social recovery for lost devices, allowlists for spending limits, and more. The naive approach is to build all of this into one contract and redeploy when requirements change.

The problem: redeploying a smart account means the user gets a new address. Their old address still holds their funds and history. Every upgrade becomes a migration event — move funds, update allowances, notify counterparties. For a wallet, this is unacceptable UX.

The secondary problem: a monolithic contract that handles session keys, recovery, allowlists, and spending limits in one file becomes very large, very hard to audit, and very risky to change. A bug in the recovery module can take down auth entirely.

Helios is built on Soroban (Stellar's smart contract platform), which does not have an equivalent of Ethereum's `delegatecall`. Upgrade patterns that rely on proxy contracts forwarding execution context are not directly portable. We need a different approach.

---

## Decision

The smart account contract stores a set of installed plugin addresses in instance storage under `DataKey::Plugins`. When `__check_auth` is called by the Soroban host, the account aggregates verdicts from each installed plugin before approving or rejecting the transaction.

Each plugin is a separate deployed contract that implements a common interface. The account owner can install or uninstall plugins without redeploying the account itself. The account address stays the same. State is preserved.

The current `__check_auth` implementation handles threshold signature verification directly. Plugin aggregation is the next layer being built on top of this foundation — the `DataKey::Plugins` storage key is already defined and reserved for this purpose.

---

## Consequences

**Positive**

- The account address never changes. Users fund it once and it stays theirs.
- New auth policies (session keys, recovery, allowlists) can be added as plugins without touching the core account contract.
- Each plugin has a small, focused audit surface. A security review of the session-key plugin does not require re-auditing recovery logic.
- Plugins can be developed and shipped independently by different contributors.

**Negative**

- Every auth check that involves plugins requires cross-contract calls, which costs more gas than a single contract lookup.
- Composed policies are harder to reason about. If three plugins are installed and one rejects, the behavior depends on the aggregation logic — this must be well-specified and well-tested.
- Plugin bugs can affect account security. Installing an untrusted plugin is a risk the user takes on explicitly.

---

## Alternatives Considered

**A. Monolithic account with feature flags**

Add session keys, recovery, and allowlists directly to the smart account contract, gated by feature flags in storage. Upgrade by redeploying with a migration script.

Rejected because redeployment changes the account address. Even with a migration script, the user experience of "your wallet address changed" is a non-starter. The contract also grows unboundedly as new policies are added.

**B. ERC-7579-style modular accounts ported to Soroban**

[ERC-7579](https://eips.ethereum.org/EIPS/eip-7579) defines a standard interface for modular smart accounts on EVM. The core idea — a minimal account that delegates to installed modules — is the same as what Helios does.

We drew heavily on ERC-7579's design philosophy. The difference is execution context: EVM modules use `delegatecall` to execute inside the account's storage context. Soroban does not have `delegatecall`. Helios plugins are called as external contracts and return verdicts rather than executing in-place. This is a meaningful difference in the trust and capability model.

**C. Per-user account factory that bakes policies in at deploy time**

Deploy a fresh account contract for each user with their chosen policies compiled in. Want to add session keys later? Deploy a new contract with session keys included and migrate.

Rejected for the same reason as option A — migration