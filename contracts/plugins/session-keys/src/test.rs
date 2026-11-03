use super::{CallContext, PolicyResult, SessionKeys, SessionKeysClient, SessionKeysError};
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{symbol_short, vec, Address, BytesN, Env, IntoVal};

fn setup() -> (Env, SessionKeysClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| {
        li.timestamp = 1_000_000;
    });
    let contract_id = env.register(SessionKeys, ());
    let client = SessionKeysClient::new(&env, &contract_id);
    (env, client)
}

fn session_pubkey(env: &Env, byte: u8) -> BytesN<32> {
    let mut arr = [0u8; 32];
    arr[0] = byte;
    BytesN::from_array(env, &arr)
}

fn dummy_call(env: &Env, destination: Address) -> CallContext {
    CallContext {
        contract: destination,
        function: symbol_short!("transfer"),
        args: vec![env],
    }
}

#[test]
fn issue_stores_session_key_and_lists_it() {
    let (env, client) = setup();
    let account = Address::generate(&env);
    let pubkey = session_pubkey(&env, 1);

    client.issue_session_key(
        &account,
        &pubkey,
        &(1_000_000u64 + 3600),
        &vec![&env],
        &None,
    );

    let stored = client.get_session_key(&account, &pubkey).unwrap();
    assert_eq!(stored.expiry, 1_000_000 + 3600);
    assert!(stored.scope.is_empty());
    assert_eq!(stored.spending_cap, None);

    let listed = client.list_session_keys(&account);
    assert_eq!(listed.len(), 1);
    assert_eq!(listed.get(0).unwrap(), pubkey);
}

#[test]
fn issue_requires_account_auth() {
    let env = Env::default();
    env.ledger().with_mut(|li| {
        li.timestamp = 1_000_000;
    });
    let contract_id = env.register(SessionKeys, ());
    let client = SessionKeysClient::new(&env, &contract_id);
    let account = Address::generate(&env);
    let pubkey = session_pubkey(&env, 1);

    let result = client.try_issue_session_key(
        &account,
        &pubkey,
        &(1_000_000u64 + 3600),
        &vec![&env],
        &None,
    );
    assert!(result.is_err());
}

#[test]
fn issue_rejects_past_expiry() {
    let (env, client) = setup();
    let account = Address::generate(&env);
    let pubkey = session_pubkey(&env, 1);

    let result = client.try_issue_session_key(&account, &pubkey, &999_000u64, &vec![&env], &None);
    assert_eq!(result.err(), Some(Ok(SessionKeysError::PastExpiry)));
}

#[test]
fn issue_rejects_duplicate() {
    let (env, client) = setup();
    let account = Address::generate(&env);
    let pubkey = session_pubkey(&env, 1);

    client.issue_session_key(
        &account,
        &pubkey,
        &(1_000_000u64 + 3600),
        &vec![&env],
        &None,
    );

    let result = client.try_issue_session_key(
        &account,
        &pubkey,
        &(1_000_000u64 + 7200),
        &vec![&env],
        &None,
    );
    assert_eq!(result.err(), Some(Ok(SessionKeysError::AlreadyIssued)));
}

#[test]
fn revoke_removes_key() {
    let (env, client) = setup();
    let account = Address::generate(&env);
    let pubkey = session_pubkey(&env, 1);

    client.issue_session_key(
        &account,
        &pubkey,
        &(1_000_000u64 + 3600),
        &vec![&env],
        &None,
    );
    client.revoke_session_key(&account, &pubkey);

    assert_eq!(client.get_session_key(&account, &pubkey), None);
    assert_eq!(client.list_session_keys(&account).len(), 0);
}

#[test]
fn revoke_unknown_key_errors() {
    let (env, client) = setup();
    let account = Address::generate(&env);
    let pubkey = session_pubkey(&env, 1);

    let result = client.try_revoke_session_key(&account, &pubkey);
    assert_eq!(result.err(), Some(Ok(SessionKeysError::NotFound)));
}

#[test]
fn list_session_keys_returns_all_issued() {
    let (env, client) = setup();
    let account = Address::generate(&env);

    for byte in 1..=3u8 {
        client.issue_session_key(
            &account,
            &session_pubkey(&env, byte),
            &(1_000_000u64 + 3600),
            &vec![&env],
            &None,
        );
    }

    let listed = client.list_session_keys(&account);
    assert_eq!(listed.len(), 3);
}

#[test]
fn check_session_key_allows_in_scope_call() {
    let (env, client) = setup();
    let account = Address::generate(&env);
    let pubkey = session_pubkey(&env, 1);
    let destination = Address::generate(&env);

    client.issue_session_key(
        &account,
        &pubkey,
        &(1_000_000u64 + 3600),
        &vec![&env, destination.clone()],
        &None,
    );

    let call = dummy_call(&env, destination);
    assert_eq!(
        client.check_session_key(&account, &pubkey, &call),
        PolicyResult::Allow,
    );
}

#[test]
fn check_session_key_allows_empty_scope() {
    let (env, client) = setup();
    let account = Address::generate(&env);
    let pubkey = session_pubkey(&env, 1);

    client.issue_session_key(
        &account,
        &pubkey,
        &(1_000_000u64 + 3600),
        &vec![&env],
        &None,
    );

    let call = dummy_call(&env, Address::generate(&env));
    assert_eq!(
        client.check_session_key(&account, &pubkey, &call),
        PolicyResult::Allow,
    );
}

#[test]
fn check_session_key_denies_out_of_scope() {
    let (env, client) = setup();
    let account = Address::generate(&env);
    let pubkey = session_pubkey(&env, 1);
    let allowed = Address::generate(&env);
    let other = Address::generate(&env);

    client.issue_session_key(
        &account,
        &pubkey,
        &(1_000_000u64 + 3600),
        &vec![&env, allowed],
        &None,
    );

    let call = dummy_call(&env, other);
    assert_eq!(
        client.check_session_key(&account, &pubkey, &call),
        PolicyResult::Deny,
    );
}

#[test]
fn check_session_key_denies_expired() {
    let (env, client) = setup();
    let account = Address::generate(&env);
    let pubkey = session_pubkey(&env, 1);

    client.issue_session_key(&account, &pubkey, &(1_000_000u64 + 60), &vec![&env], &None);

    env.ledger().with_mut(|li| {
        li.timestamp = 1_000_000 + 120;
    });

    let call = dummy_call(&env, Address::generate(&env));
    assert_eq!(
        client.check_session_key(&account, &pubkey, &call),
        PolicyResult::Deny,
    );
}

#[test]
fn check_session_key_defers_when_unknown() {
    let (env, client) = setup();
    let account = Address::generate(&env);
    let pubkey = session_pubkey(&env, 42);

    let call = dummy_call(&env, Address::generate(&env));
    assert_eq!(
        client.check_session_key(&account, &pubkey, &call),
        PolicyResult::Defer,
    );
}

#[test]
fn generic_check_always_defers() {
    let (env, client) = setup();
    let account = Address::generate(&env);

    let call = CallContext {
        contract: Address::generate(&env),
        function: symbol_short!("transfer"),
        args: vec![&env, 100i128.into_val(&env)],
    };
    assert_eq!(client.check(&account, &call), PolicyResult::Defer);
}
