#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, vec, Address, Bytes, BytesN,
    Env, IntoVal, Val, Vec,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    SmartAccountWasmHash,
    SessionKeysPlugin,
}

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
pub struct InitArgs {
    pub signers: Vec<Signer>,
    pub threshold: u32,
    pub session_keys_plugin: Option<Address>,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum FactoryError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    PluginAlreadySet = 3,
}

#[contract]
pub struct Factory;

#[contractimpl]
impl Factory {
    pub fn init(env: Env, smart_account_wasm_hash: BytesN<32>) {
        if env.storage().instance().has(&DataKey::SmartAccountWasmHash) {
            panic!("already initialized");
        }
        env.storage()
            .instance()
            .set(&DataKey::SmartAccountWasmHash, &smart_account_wasm_hash);
    }

    pub fn smart_account_wasm_hash(env: Env) -> BytesN<32> {
        env.storage()
            .instance()
            .get(&DataKey::SmartAccountWasmHash)
            .expect("not initialized")
    }

    pub fn predict_address(env: Env, credential_id: Bytes) -> Address {
        let salt = Self::salt(&env, &credential_id);
        env.deployer()
            .with_current_contract(salt)
            .deployed_address()
    }

    pub fn deploy_account(env: Env, credential_id: Bytes, pubkey: BytesN<32>) -> Address {
        let wasm_hash: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::SmartAccountWasmHash)
            .expect("not initialized");

        let salt = Self::salt(&env, &credential_id);
        let deployed = env
            .deployer()
            .with_current_contract(salt)
            .deploy_v2(wasm_hash, ());

        let signer = Signer {
            kind: SignerKind::Secp256r1,
            key: pubkey,
        };
        let session_keys_plugin: Option<Address> =
            env.storage().instance().get(&DataKey::SessionKeysPlugin);
        let args = InitArgs {
            signers: vec![&env, signer],
            threshold: 1,
            session_keys_plugin,
        };
        let init_args: Vec<Val> = vec![&env, args.into_val(&env)];
        env.invoke_contract::<()>(&deployed, &symbol_short!("init"), init_args);

        deployed
    }

    /// Configure the session-keys plugin address that future `deploy_account`
    /// calls will pass to the smart-account's init. Settable once.
    pub fn set_session_keys_plugin(env: Env, plugin_address: Address) -> Result<(), FactoryError> {
        if env.storage().instance().has(&DataKey::SessionKeysPlugin) {
            return Err(FactoryError::PluginAlreadySet);
        }
        env.storage()
            .instance()
            .set(&DataKey::SessionKeysPlugin, &plugin_address);
        Ok(())
    }

    pub fn session_keys_plugin(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::SessionKeysPlugin)
    }

    fn salt(env: &Env, credential_id: &Bytes) -> BytesN<32> {
        env.crypto().sha256(credential_id).to_bytes()
    }
}

#[cfg(test)]
mod test;
