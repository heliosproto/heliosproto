#![cfg(test)]

use super::{InitArgs, SmartAccount, SmartAccountClient};
use soroban_sdk::{testutils::Address as _, vec, Address, Env};

fn setup(env: &Env) -> SmartAccountClient<'_> {
    let contract_id = env.register(SmartAccount, ());
    SmartAccountClient::new(env, &contract_id)
}

#[test]
fn init_with_single_signer_sets_threshold_one() {
    let env = Env::default();
    let client = setup(&env);

    let signer = Address::generate(&env);
    client.init(&InitArgs {
        signers: vec![&env, signer.clone()],
        threshold: 1,
    });

    assert_eq!(client.signers(), vec![&env, signer]);
    assert_eq!(client.threshold(), 1);
    assert_eq!(client.nonce(), 0);
}

#[test]
fn init_with_multisig_two_of_three() {
    let env = Env::default();
    let client = setup(&env);

    let signers = vec![
        &env,
        Address::generate(&env),
        Address::generate(&env),
        Address::generate(&env),
    ];

    client.init(&InitArgs {
        signers: signers.clone(),
        threshold: 2,
    });

    assert_eq!(client.signers().len(), 3);
    assert_eq!(client.threshold(), 2);
}

#[test]
#[should_panic(expected = "already initialized")]
fn init_twice_panics() {
    let env = Env::default();
    let client = setup(&env);

    let signer = Address::generate(&env);
    let args = InitArgs {
        signers: vec![&env, signer],
        threshold: 1,
    };

    client.init(&args);
    client.init(&args);
}

#[test]
#[should_panic(expected = "invalid threshold")]
fn threshold_greater_than_signers_panics() {
    let env = Env::default();
    let client = setup(&env);

    client.init(&InitArgs {
        signers: vec![&env, Address::generate(&env)],
        threshold: 5,
    });
}

#[test]
#[should_panic(expected = "at least one signer required")]
fn empty_signers_panics() {
    let env = Env::default();
    let client = setup(&env);

    client.init(&InitArgs {
        signers: vec![&env],
        threshold: 1,
    });
}
