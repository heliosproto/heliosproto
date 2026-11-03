#![no_std]

//! Session-keys plugin for Helios Protocol smart accounts.
//!
//! Defines the shared `PolicyResult` and `CallContext` types used by every
//! plugin, plus a self-contained session-key store with issue, revoke, and
//! policy-check entrypoints. A session key is a temporary signer scoped to a
//! set of destination contracts and bounded by an expiry and an optional
//! spending cap. A smart account that has this plugin installed can delegate
//! fine-grained transaction authority to a dApp without exposing its root
//! passkey.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, Symbol, Val, Vec,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PolicyResult {
    Allow,
    Deny,
    Defer,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CallContext {
    pub contract: Address,
    pub function: Symbol,
    pub args: Vec<Val>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SessionKey {
    /// Unix timestamp (ledger seconds) after which the key is invalid.
    pub expiry: u64,
    /// Destination contracts the key may authorize calls to. Empty = any.
    pub scope: Vec<Address>,
    /// Optional spending cap. Informational for now; enforcement by callers.
    pub spending_cap: Option<i128>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Per-account index of issued session key pubkeys.
    Index(Address),
    /// The session key record itself, keyed by (account, pubkey).
    Key(Address, BytesN<32>),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum SessionKeysError {
    AlreadyIssued = 1,
    NotFound = 2,
    PastExpiry = 3,
}

#[contract]
pub struct SessionKeys;

#[contractimpl]
impl SessionKeys {
    /// Register a new session key for `account`, scoped to `scope` and
    /// valid until `expiry`. Requires `account.require_auth()`.
    pub fn issue_session_key(
        env: Env,
        account: Address,
        pubkey: BytesN<32>,
        expiry: u64,
        scope: Vec<Address>,
        spending_cap: Option<i128>,
    ) -> Result<(), SessionKeysError> {
        account.require_auth();

        if expiry <= env.ledger().timestamp() {
            return Err(SessionKeysError::PastExpiry);
        }

        let key_ref = DataKey::Key(account.clone(), pubkey.clone());
        if env.storage().persistent().has(&key_ref) {
            return Err(SessionKeysError::AlreadyIssued);
        }

        let record = SessionKey {
            expiry,
            scope,
            spending_cap,
        };
        env.storage().persistent().set(&key_ref, &record);

        let index_ref = DataKey::Index(account);
        let mut index: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&index_ref)
            .unwrap_or_else(|| Vec::new(&env));
        index.push_back(pubkey);
        env.storage().persistent().set(&index_ref, &index);

        Ok(())
    }

    /// Revoke a session key previously issued to `account`. Requires
    /// `account.require_auth()`.
    pub fn revoke_session_key(
        env: Env,
        account: Address,
        pubkey: BytesN<32>,
    ) -> Result<(), SessionKeysError> {
        account.require_auth();

        let key_ref = DataKey::Key(account.clone(), pubkey.clone());
        if !env.storage().persistent().has(&key_ref) {
            return Err(SessionKeysError::NotFound);
        }
        env.storage().persistent().remove(&key_ref);

        let index_ref = DataKey::Index(account);
        if let Some(index) = env
            .storage()
            .persistent()
            .get::<_, Vec<BytesN<32>>>(&index_ref)
        {
            let mut next: Vec<BytesN<32>> = Vec::new(&env);
            for entry in index.iter() {
                if entry != pubkey {
                    next.push_back(entry);
                }
            }
            env.storage().persistent().set(&index_ref, &next);
        }

        Ok(())
    }

    /// Return the session key record for `(account, pubkey)` if present.
    pub fn get_session_key(env: Env, account: Address, pubkey: BytesN<32>) -> Option<SessionKey> {
        env.storage()
            .persistent()
            .get(&DataKey::Key(account, pubkey))
    }

    /// List all session key pubkeys issued to `account`.
    pub fn list_session_keys(env: Env, account: Address) -> Vec<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::Index(account))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Evaluate a proposed call under the policy of a specific session key.
    /// Returns `Defer` if no such session key exists, `Deny` if the key is
    /// expired or the call target is out of scope, and `Allow` otherwise.
    pub fn check_session_key(
        env: Env,
        account: Address,
        pubkey: BytesN<32>,
        call: CallContext,
    ) -> PolicyResult {
        let record: SessionKey = match env
            .storage()
            .persistent()
            .get(&DataKey::Key(account, pubkey))
        {
            Some(key) => key,
            None => return PolicyResult::Defer,
        };

        if env.ledger().timestamp() > record.expiry {
            return PolicyResult::Deny;
        }

        if !record.scope.is_empty() && !record.scope.contains(&call.contract) {
            return PolicyResult::Deny;
        }

        PolicyResult::Allow
    }

    /// Generic plugin entrypoint. Session-key authorization routes through
    /// `check_session_key` instead; this generic hook always defers.
    pub fn check(env: Env, account: Address, call: CallContext) -> PolicyResult {
        _ = (env, account, call);
        PolicyResult::Defer
    }
}

#[cfg(test)]
mod test;
