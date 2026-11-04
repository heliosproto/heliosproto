use super::{Factory, FactoryClient, FactoryError};
use soroban_sdk::testutils::{Address as _, BytesN as _};
use soroban_sdk::{Address, Bytes, BytesN, Env};

fn setup() -> (Env, FactoryClient<'static>, BytesN<32>) {
    let env = Env::default();
    let factory_id = env.register(Factory, ());
    let factory = FactoryClient::new(&env, &factory_id);
    let wasm_hash = BytesN::<32>::random(&env);
    factory.init(&wasm_hash);
    (env, factory, wasm_hash)
}

fn credential(env: &Env, byte: u8) -> Bytes {
    let data: [u8; 16] = [byte; 16];
    Bytes::from_array(env, &data)
}

#[test]
fn init_stores_wasm_hash() {
    let (_env, factory, wasm_hash) = setup();
    assert_eq!(factory.smart_account_wasm_hash(), wasm_hash);
}

#[test]
#[should_panic(expected = "already initialized")]
fn init_twice_panics() {
    let (env, factory, _) = setup();
    let other_hash = BytesN::<32>::random(&env);
    factory.init(&other_hash);
}

#[test]
fn predict_address_is_deterministic() {
    let (env, factory, _) = setup();
    let cred = credential(&env, 1);
    let first = factory.predict_address(&cred);
    let second = factory.predict_address(&cred);
    assert_eq!(first, second);
}

#[test]
fn predict_address_differs_for_different_credentials() {
    let (env, factory, _) = setup();
    let a = factory.predict_address(&credential(&env, 1));
    let b = factory.predict_address(&credential(&env, 2));
    assert_ne!(a, b);
}

#[test]
fn session_keys_plugin_is_none_by_default() {
    let (_env, factory, _) = setup();
    assert_eq!(factory.session_keys_plugin(), None);
}

#[test]
fn set_session_keys_plugin_stores_address() {
    let (env, factory, _) = setup();
    let plugin = Address::generate(&env);

    factory.set_session_keys_plugin(&plugin);
    assert_eq!(factory.session_keys_plugin(), Some(plugin));
}

#[test]
fn set_session_keys_plugin_twice_errors() {
    let (env, factory, _) = setup();
    let plugin = Address::generate(&env);
    let other = Address::generate(&env);

    factory.set_session_keys_plugin(&plugin);
    let result = factory.try_set_session_keys_plugin(&other);
    assert_eq!(result.err(), Some(Ok(FactoryError::PluginAlreadySet)));
}
