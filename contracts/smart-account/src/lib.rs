#![no_std]

use soroban_sdk::auth::{Context, CustomAccountInterface};
use soroban_sdk::crypto::Hash;
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, IntoVal, Symbol,
    Val, Vec,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SignerKind {
    Ed25519,
    Secp256r1,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Signer {
    pub kind: SignerKind,
    pub key: BytesN<32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Signers,
    Threshold,
    Nonce,
    Plugins,
    SessionKeysPlugin,
    SessionKeyPubkeys,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InitArgs {
    pub signers: Vec<Signer>,
    pub threshold: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuthPayload {
    pub nonce: u64,
    pub pubkeys: Vec<BytesN<32>>,
}

/// Mirror of `heliosproto_session_keys::PolicyResult`. Reproduced here so the
/// smart-account does not need a build-time dependency on the plugin crate;
/// the wire representation (contracttype enum, same variants in the same
/// order) is what matters for cross-contract calls.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PluginPolicy {
    Allow,
    Deny,
    Defer,
}

/// Mirror of `heliosproto_session_keys::CallContext`. Same reasoning as
/// `PluginPolicy`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PluginCall {
    pub contract: Address,
    pub function: Symbol,
    pub args: Vec<Val>,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum AuthError {
    BadNonce = 1,
    InvalidSignature = 2,
    InsufficientWeight = 3,
    /// A session-key signer appeared alongside a non-session-key signer.
    MixedAuth = 4,
    /// Session-keys plugin was not installed when a session-key auth attempted.
    SessionKeysUnavailable = 5,
    /// The session-keys plugin denied a call context.
    SessionDenied = 6,
    /// An auth context cannot be routed through the plugin (e.g. contract
    /// creation).
    UnroutableAuthContext = 7,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum AccountError {
    AlreadyInstalled = 1,
    NotInstalled = 2,
    AlreadyRegistered = 3,
}

#[contract]
pub struct SmartAccount;

#[contractimpl]
impl CustomAccountInterface for SmartAccount {
    type Signature = AuthPayload;
    type Error = AuthError;

    fn __check_auth(
        env: Env,
        _signature_payload: Hash<32>,
        signatures: Self::Signature,
        auth_contexts: Vec<Context>,
    ) -> Result<(), Self::Error> {
        let stored_nonce: u64 = env.storage().instance().get(&DataKey::Nonce).unwrap_or(0);
        if signatures.nonce != stored_nonce {
            return Err(AuthError::BadNonce);
        }

        let session_pubkeys: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&DataKey::SessionKeyPubkeys)
            .unwrap_or_else(|| Vec::new(&env));

        let mut session_count: u32 = 0;
        let mut regular_count: u32 = 0;
        for pubkey in signatures.pubkeys.iter() {
            if session_pubkeys.iter().any(|sk| sk == pubkey) {
                session_count += 1;
            } else {
                regular_count += 1;
            }
        }

        if session_count > 0 && regular_count > 0 {
            return Err(AuthError::MixedAuth);
        }

        if session_count > 0 {
            check_session_auth(&env, &signatures.pubkeys, &auth_contexts)?;
        } else {
            check_regular_auth(&env, &signatures.pubkeys)?;
        }

        env.storage()
            .instance()
            .set(&DataKey::Nonce, &(stored_nonce + 1));
        Ok(())
    }
}

fn check_regular_auth(env: &Env, pubkeys: &Vec<BytesN<32>>) -> Result<(), AuthError> {
    let stored_signers: Vec<Signer> = env
        .storage()
        .instance()
        .get(&DataKey::Signers)
        .expect("not initialized");
    let threshold: u32 = env
        .storage()
        .instance()
        .get(&DataKey::Threshold)
        .expect("not initialized");

    let mut valid_count: u32 = 0;
    for pubkey in pubkeys.iter() {
        let found = stored_signers.iter().any(|signer| signer.key == pubkey);
        if found {
            valid_count += 1;
        }
    }

    if valid_count < threshold {
        return Err(AuthError::InvalidSignature);
    }
    Ok(())
}

fn check_session_auth(
    env: &Env,
    pubkeys: &Vec<BytesN<32>>,
    auth_contexts: &Vec<Context>,
) -> Result<(), AuthError> {
    let plugin: Address = env
        .storage()
        .instance()
        .get(&DataKey::SessionKeysPlugin)
        .ok_or(AuthError::SessionKeysUnavailable)?;
    let account = env.current_contract_address();

    for context in auth_contexts.iter() {
        let call = match context {
            Context::Contract(ctx) => PluginCall {
                contract: ctx.contract,
                function: ctx.fn_name,
                args: ctx.args,
            },
            _ => return Err(AuthError::UnroutableAuthContext),
        };

        for pubkey in pubkeys.iter() {
            let args: Vec<Val> = (account.clone(), pubkey, call.clone()).into_val(env);
            let result: PluginPolicy =
                env.invoke_contract(&plugin, &Symbol::new(env, "check_session_key"), args);
            if result != PluginPolicy::Allow {
                return Err(AuthError::SessionDenied);
            }
        }
    }

    Ok(())
}

#[contractimpl]
impl SmartAccount {
    pub fn init(env: Env, args: InitArgs) {
        if env.storage().instance().has(&DataKey::Signers) {
            panic!("already initialized");
        }
        if args.signers.is_empty() {
            panic!("at least one signer required");
        }
        if args.threshold == 0 || args.threshold > args.signers.len() {
            panic!("invalid threshold");
        }

        env.storage()
            .instance()
            .set(&DataKey::Signers, &args.signers);
        env.storage()
            .instance()
            .set(&DataKey::Threshold, &args.threshold);
        env.storage().instance().set(&DataKey::Nonce, &0u64);
    }

    pub fn signers(env: Env) -> Vec<Signer> {
        env.storage()
            .instance()
            .get(&DataKey::Signers)
            .expect("not initialized")
    }

    pub fn threshold(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Threshold)
            .expect("not initialized")
    }

    pub fn nonce(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::Nonce).unwrap_or(0)
    }

    /// Install the session-keys plugin at `plugin_address`. Requires the
    /// account to authorize. Once installed, session-key-authorized auth
    /// checks will route through the plugin.
    pub fn install_session_keys(env: Env, plugin_address: Address) -> Result<(), AccountError> {
        env.current_contract_address().require_auth();
        if env.storage().instance().has(&DataKey::SessionKeysPlugin) {
            return Err(AccountError::AlreadyInstalled);
        }
        env.storage()
            .instance()
            .set(&DataKey::SessionKeysPlugin, &plugin_address);
        Ok(())
    }

    pub fn session_keys_plugin(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::SessionKeysPlugin)
    }

    /// Register `pubkey` as a session key signer for this account. The key
    /// must still be issued on the installed session-keys plugin (which
    /// stores the scope, expiry, and cap) for calls to actually pass
    /// `__check_auth`.
    pub fn register_session_key(env: Env, pubkey: BytesN<32>) -> Result<(), AccountError> {
        env.current_contract_address().require_auth();
        if !env.storage().instance().has(&DataKey::SessionKeysPlugin) {
            return Err(AccountError::NotInstalled);
        }

        let mut registered: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&DataKey::SessionKeyPubkeys)
            .unwrap_or_else(|| Vec::new(&env));
        if registered.iter().any(|existing| existing == pubkey) {
            return Err(AccountError::AlreadyRegistered);
        }
        registered.push_back(pubkey);
        env.storage()
            .instance()
            .set(&DataKey::SessionKeyPubkeys, &registered);
        Ok(())
    }

    pub fn session_key_pubkeys(env: Env) -> Vec<BytesN<32>> {
        env.storage()
            .instance()
            .get(&DataKey::SessionKeyPubkeys)
            .unwrap_or_else(|| Vec::new(&env))
    }
}

#[cfg(test)]
mod test;
