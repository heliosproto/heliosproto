#![no_std]

//! Core smart account contract for Helios Protocol.
//!
//! Holds the authorized signer set, a per-account nonce, the multisig threshold,
//! and the set of installed plugin contract addresses. This module exposes the
//! minimal storage and getter surface used by all other components. Signature
//! verification, plugin dispatch, and `__check_auth` are added in follow-up
//! issues.

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Signers,
    Threshold,
    Nonce,
    Plugins,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InitArgs {
    pub signers: Vec<Address>,
    pub threshold: u32,
}

#[contract]
pub struct SmartAccount;

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

    pub fn signers(env: Env) -> Vec<Address> {
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
}

#[cfg(test)]
mod test;
