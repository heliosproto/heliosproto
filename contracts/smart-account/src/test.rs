use super::{
    AuthError, AuthPayload, InitArgs, Signer, SignerKind, SmartAccount, SmartAccountClient,
};
use heliosproto_session_keys::{SessionKeys, SessionKeysClient};
use soroban_sdk::auth::{Context, ContractContext};
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{symbol_short, vec, Address, BytesN, Env, IntoVal, Vec};

fn key(env: &Env, byte: u8) -> BytesN<32> {
    let mut arr = [0u8; 32];
    arr[0] = byte;
    BytesN::from_array(env, &arr)
}

fn ed25519_signer(env: &Env, byte: u8) -> Signer {
    Signer {
        kind: SignerKind::Ed25519,
        key: key(env, byte),
    }
}

fn setup_with_signers(env: &Env, signers: Vec<Signer>, threshold: u32) -> SmartAccountClient<'_> {
    let contract_id = env.register(SmartAccount, ());
    let client = SmartAccountClient::new(env, &contract_id);
    client.init(&InitArgs {
        signers,
        threshold,
        session_keys_plugin: None,
    });
    client
}

#[test]
fn init_with_single_signer_sets_threshold_one() {
    let env = Env::default();
    let client = setup_with_signers(&env, vec![&env, ed25519_signer(&env, 1)], 1);

    assert_eq!(client.signers(), vec![&env, ed25519_signer(&env, 1)]);
    assert_eq!(client.threshold(), 1);
    assert_eq!(client.nonce(), 0);
}

#[test]
fn init_with_multisig_two_of_three() {
    let env = Env::default();
    let signers = vec![
        &env,
        ed25519_signer(&env, 1),
        ed25519_signer(&env, 2),
        ed25519_signer(&env, 3),
    ];
    let client = setup_with_signers(&env, signers.clone(), 2);

    assert_eq!(client.signers().len(), 3);
    assert_eq!(client.threshold(), 2);
}

#[test]
#[should_panic(expected = "already initialized")]
fn init_twice_panics() {
    let env = Env::default();
    let client = setup_with_signers(&env, vec![&env, ed25519_signer(&env, 1)], 1);
    client.init(&InitArgs {
        signers: vec![&env, ed25519_signer(&env, 1)],
        threshold: 1,
        session_keys_plugin: None,
    });
}

#[test]
#[should_panic(expected = "invalid threshold")]
fn threshold_greater_than_signers_panics() {
    let env = Env::default();
    let _client = setup_with_signers(&env, vec![&env, ed25519_signer(&env, 1)], 5);
}

#[test]
#[should_panic(expected = "at least one signer required")]
fn empty_signers_panics() {
    let env = Env::default();
    let _client = setup_with_signers(&env, vec![&env], 1);
}

#[test]
fn valid_single_signer_correct_nonce_passes() {
    let env = Env::default();
    let signers = vec![&env, ed25519_signer(&env, 1)];
    let client = setup_with_signers(&env, signers, 1);

    let payload = AuthPayload {
        nonce: 0,
        pubkeys: vec![&env, key(&env, 1)],
    };
    let res: Result<(), Result<AuthError, soroban_sdk::InvokeError>> = env
        .try_invoke_contract_check_auth::<AuthError>(
            &client.address,
            &BytesN::from_array(&env, &[0; 32]),
            payload.into_val(&env),
            &vec![&env],
        );
    assert!(res.is_ok());
    assert_eq!(client.nonce(), 1);
}

#[test]
fn wrong_signature_panics() {
    let env = Env::default();
    let signers = vec![&env, ed25519_signer(&env, 1)];
    let client = setup_with_signers(&env, signers, 1);

    let payload = AuthPayload {
        nonce: 0,
        pubkeys: vec![&env, key(&env, 99)], // not a stored signer
    };
    let res: Result<(), Result<AuthError, soroban_sdk::InvokeError>> = env
        .try_invoke_contract_check_auth::<AuthError>(
            &client.address,
            &BytesN::from_array(&env, &[0; 32]),
            payload.into_val(&env),
            &vec![&env],
        );
    assert!(matches!(res, Err(Ok(AuthError::InvalidSignature))));
}

#[test]
fn stale_nonce_panics() {
    let env = Env::default();
    let signers = vec![&env, ed25519_signer(&env, 1)];
    let client = setup_with_signers(&env, signers, 1);

    let payload = AuthPayload {
        nonce: 42, // wrong nonce
        pubkeys: vec![&env, key(&env, 1)],
    };
    let res: Result<(), Result<AuthError, soroban_sdk::InvokeError>> = env
        .try_invoke_contract_check_auth::<AuthError>(
            &client.address,
            &BytesN::from_array(&env, &[0; 32]),
            payload.into_val(&env),
            &vec![&env],
        );
    assert!(matches!(res, Err(Ok(AuthError::BadNonce))));
}

#[test]
fn multisig_two_of_three_with_one_signature_panics() {
    let env = Env::default();
    let signers = vec![
        &env,
        ed25519_signer(&env, 1),
        ed25519_signer(&env, 2),
        ed25519_signer(&env, 3),
    ];
    let client = setup_with_signers(&env, signers, 2);

    let payload = AuthPayload {
        nonce: 0,
        pubkeys: vec![&env, key(&env, 1)], // only 1 of 2 needed
    };
    let res: Result<(), Result<AuthError, soroban_sdk::InvokeError>> = env
        .try_invoke_contract_check_auth::<AuthError>(
            &client.address,
            &BytesN::from_array(&env, &[0; 32]),
            payload.into_val(&env),
            &vec![&env],
        );
    assert!(matches!(res, Err(Ok(AuthError::InvalidSignature))));
}

#[test]
fn multisig_two_of_three_with_two_signatures_passes() {
    let env = Env::default();
    let signers = vec![
        &env,
        ed25519_signer(&env, 1),
        ed25519_signer(&env, 2),
        ed25519_signer(&env, 3),
    ];
    let client = setup_with_signers(&env, signers, 2);

    let payload = AuthPayload {
        nonce: 0,
        pubkeys: vec![&env, key(&env, 1), key(&env, 2)], // 2 of 3
    };
    let res: Result<(), Result<AuthError, soroban_sdk::InvokeError>> = env
        .try_invoke_contract_check_auth::<AuthError>(
            &client.address,
            &BytesN::from_array(&env, &[0; 32]),
            payload.into_val(&env),
            &vec![&env],
        );
    assert!(res.is_ok());
    assert_eq!(client.nonce(), 1);
}

fn setup_with_session_plugin(env: &Env) -> (SmartAccountClient<'_>, SessionKeysClient<'_>) {
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 1_000_000;
    });

    let account_client = setup_with_signers(env, vec![env, ed25519_signer(env, 1)], 1);
    let session_keys_id = env.register(SessionKeys, ());
    let session_keys_client = SessionKeysClient::new(env, &session_keys_id);

    account_client.install_session_keys(&session_keys_id);
    (account_client, session_keys_client)
}

#[test]
fn init_with_plugin_stores_it() {
    let env = Env::default();
    let session_keys_id = env.register(SessionKeys, ());
    let contract_id = env.register(SmartAccount, ());
    let client = SmartAccountClient::new(&env, &contract_id);
    client.init(&InitArgs {
        signers: vec![&env, ed25519_signer(&env, 1)],
        threshold: 1,
        session_keys_plugin: Some(session_keys_id.clone()),
    });

    assert_eq!(client.session_keys_plugin(), Some(session_keys_id));
}

fn contract_context(env: &Env, destination: Address) -> Context {
    Context::Contract(ContractContext {
        contract: destination,
        fn_name: symbol_short!("transfer"),
        args: vec![env],
    })
}

#[test]
fn install_session_keys_stores_plugin_address() {
    let env = Env::default();
    let (account, session_keys_client) = setup_with_session_plugin(&env);

    assert_eq!(
        account.session_keys_plugin(),
        Some(session_keys_client.address.clone()),
    );
}

#[test]
fn install_session_keys_twice_errors() {
    let env = Env::default();
    let (account, _) = setup_with_session_plugin(&env);
    let other_plugin = Address::generate(&env);
    assert!(account.try_install_session_keys(&other_plugin).is_err());
}

#[test]
fn register_session_key_appends_to_pubkeys() {
    let env = Env::default();
    let (account, _) = setup_with_session_plugin(&env);
    let session_pk = key(&env, 42);

    account.register_session_key(&session_pk);
    assert_eq!(account.session_key_pubkeys(), vec![&env, session_pk]);
}

#[test]
fn register_session_key_without_plugin_errors() {
    let env = Env::default();
    env.mock_all_auths();
    let account = setup_with_signers(&env, vec![&env, ed25519_signer(&env, 1)], 1);
    assert!(account.try_register_session_key(&key(&env, 42)).is_err());
}

#[test]
fn session_key_in_scope_passes_auth() {
    let env = Env::default();
    let (account, session_keys_client) = setup_with_session_plugin(&env);
    let session_pk = key(&env, 42);
    let destination = Address::generate(&env);

    account.register_session_key(&session_pk);
    session_keys_client.issue_session_key(
        &account.address,
        &session_pk,
        &(1_000_000u64 + 3600),
        &vec![&env, destination.clone()],
        &None,
    );

    let payload = AuthPayload {
        nonce: 0,
        pubkeys: vec![&env, session_pk],
    };
    let contexts: Vec<Context> = vec![&env, contract_context(&env, destination)];
    let res: Result<(), Result<AuthError, soroban_sdk::InvokeError>> = env
        .try_invoke_contract_check_auth::<AuthError>(
            &account.address,
            &BytesN::from_array(&env, &[0; 32]),
            payload.into_val(&env),
            &contexts,
        );
    assert!(res.is_ok());
    assert_eq!(account.nonce(), 1);
}

#[test]
fn session_key_out_of_scope_denied() {
    let env = Env::default();
    let (account, session_keys_client) = setup_with_session_plugin(&env);
    let session_pk = key(&env, 42);
    let allowed = Address::generate(&env);
    let other = Address::generate(&env);

    account.register_session_key(&session_pk);
    session_keys_client.issue_session_key(
        &account.address,
        &session_pk,
        &(1_000_000u64 + 3600),
        &vec![&env, allowed],
        &None,
    );

    let payload = AuthPayload {
        nonce: 0,
        pubkeys: vec![&env, session_pk],
    };
    let contexts: Vec<Context> = vec![&env, contract_context(&env, other)];
    let res: Result<(), Result<AuthError, soroban_sdk::InvokeError>> = env
        .try_invoke_contract_check_auth::<AuthError>(
            &account.address,
            &BytesN::from_array(&env, &[0; 32]),
            payload.into_val(&env),
            &contexts,
        );
    assert!(matches!(res, Err(Ok(AuthError::SessionDenied))));
    assert_eq!(account.nonce(), 0);
}

#[test]
fn session_key_expired_denied() {
    let env = Env::default();
    let (account, session_keys_client) = setup_with_session_plugin(&env);
    let session_pk = key(&env, 42);
    let destination = Address::generate(&env);

    account.register_session_key(&session_pk);
    session_keys_client.issue_session_key(
        &account.address,
        &session_pk,
        &(1_000_000u64 + 60),
        &vec![&env, destination.clone()],
        &None,
    );

    env.ledger().with_mut(|li| {
        li.timestamp = 1_000_000 + 120;
    });

    let payload = AuthPayload {
        nonce: 0,
        pubkeys: vec![&env, session_pk],
    };
    let contexts: Vec<Context> = vec![&env, contract_context(&env, destination)];
    let res: Result<(), Result<AuthError, soroban_sdk::InvokeError>> = env
        .try_invoke_contract_check_auth::<AuthError>(
            &account.address,
            &BytesN::from_array(&env, &[0; 32]),
            payload.into_val(&env),
            &contexts,
        );
    assert!(matches!(res, Err(Ok(AuthError::SessionDenied))));
}

#[test]
fn mixed_session_and_root_signers_rejected() {
    let env = Env::default();
    let (account, session_keys_client) = setup_with_session_plugin(&env);
    let session_pk = key(&env, 42);
    let destination = Address::generate(&env);

    account.register_session_key(&session_pk);
    session_keys_client.issue_session_key(
        &account.address,
        &session_pk,
        &(1_000_000u64 + 3600),
        &vec![&env, destination.clone()],
        &None,
    );

    let payload = AuthPayload {
        nonce: 0,
        pubkeys: vec![&env, key(&env, 1), session_pk],
    };
    let contexts: Vec<Context> = vec![&env, contract_context(&env, destination)];
    let res: Result<(), Result<AuthError, soroban_sdk::InvokeError>> = env
        .try_invoke_contract_check_auth::<AuthError>(
            &account.address,
            &BytesN::from_array(&env, &[0; 32]),
            payload.into_val(&env),
            &contexts,
        );
    assert!(matches!(res, Err(Ok(AuthError::MixedAuth))));
}

#[test]
fn root_signer_still_passes_after_plugin_install() {
    let env = Env::default();
    let (account, _) = setup_with_session_plugin(&env);
    let payload = AuthPayload {
        nonce: 0,
        pubkeys: vec![&env, key(&env, 1)],
    };
    let res: Result<(), Result<AuthError, soroban_sdk::InvokeError>> = env
        .try_invoke_contract_check_auth::<AuthError>(
            &account.address,
            &BytesN::from_array(&env, &[0; 32]),
            payload.into_val(&env),
            &vec![&env],
        );
    assert!(res.is_ok());
}
