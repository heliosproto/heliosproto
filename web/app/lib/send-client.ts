import {
  Account,
  Address,
  authorizeEntry,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  Operation,
  rpc,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { TESTNET_XLM_SAC } from "./account-reader";
import { EXPLORER_BASE, FRIENDBOT_URL, TESTNET_PASSPHRASE, TESTNET_RPC } from "./factory-client";

export type SimulateTransferInput = {
  from: string;
  to: string;
  amountStroops: bigint;
};

export type SimulateOutcome =
  | {
      success: true;
      minResourceFeeStroops: bigint;
      totalFeeStroops: bigint;
      latestLedger: number;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Simulate a native XLM transfer FROM a smart-account TO a Stellar address.
 *
 * We build the Soroban invoke-host-function op with the smart-account as the
 * `from` of the inner `transfer(from, to, amount)` call. Soroban's RPC
 * simulator returns the minimum resource fee required, plus a success/error
 * verdict. No transaction is submitted.
 *
 * Simulation uses an ephemeral keypair as the Stellar source account purely
 * so the SDK has sequence-number state to build the envelope; the keypair
 * never signs anything that reaches the network.
 */
export async function simulateTransferXlm(input: SimulateTransferInput): Promise<SimulateOutcome> {
  if (input.amountStroops <= 0n) {
    return { success: false, error: "Amount must be greater than 0." };
  }

  try {
    const server = new rpc.Server(TESTNET_RPC);
    const dummy = Keypair.random();
    const source = new Account(dummy.publicKey(), "0");

    const xlmSac = new Contract(TESTNET_XLM_SAC);
    const operation = xlmSac.call(
      "transfer",
      new Address(input.from).toScVal(),
      new Address(input.to).toScVal(),
      nativeToScVal(input.amountStroops, { type: "i128" }),
    );

    const tx = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: TESTNET_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(60)
      .build();

    const sim = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(sim)) {
      return { success: false, error: sim.error };
    }
    if (!rpc.Api.isSimulationSuccess(sim)) {
      return { success: false, error: "Simulation returned no result." };
    }

    const minResourceFeeStroops = BigInt(sim.minResourceFee ?? "0");
    const totalFeeStroops = minResourceFeeStroops + BigInt(BASE_FEE);

    return {
      success: true,
      minResourceFeeStroops,
      totalFeeStroops,
      latestLedger: sim.latestLedger,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Simulation failed.",
    };
  }
}

export type BroadcastTransferInput = {
  from: string;
  to: string;
  amountStroops: bigint;
  primarySignerPubkey: Uint8Array;
  accountNonce: bigint;
};

export type BroadcastOutcome =
  | {
      success: true;
      txHash: string;
      explorerUrl: string;
      nextAccountNonce: bigint;
    }
  | {
      success: false;
      error: string;
    };

function buildAuthPayloadScVal(nonce: bigint, pubkey: Uint8Array): xdr.ScVal {
  // Mirrors the `AuthPayload` contracttype in smart-account/src/lib.rs.
  // Fields are ordered alphabetically (nonce, pubkeys) as Soroban requires.
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("nonce"),
      val: nativeToScVal(nonce, { type: "u64" }),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("pubkeys"),
      val: xdr.ScVal.scvVec([xdr.ScVal.scvBytes(Buffer.from(pubkey))]),
    }),
  ]);
}

async function fundEphemeral(address: string): Promise<void> {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`);
  if (!res.ok && res.status !== 400) {
    throw new Error(`Friendbot funding failed with status ${res.status}`);
  }
}

async function waitForInclusion(
  server: rpc.Server,
  hash: string,
): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const result = await server.getTransaction(hash);
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return result;
    }
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction ${hash} failed on-chain.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Transaction ${hash} not confirmed within 60s.`);
}

/**
 * Broadcast a native XLM transfer from the smart-account.
 *
 * Builds a Soroban invoke-host-function op calling the native XLM SAC's
 * `transfer(from, to, amount)`. Authorization for `from` (the smart-account)
 * is carried in a custom SorobanAuthorizationEntry whose `signature` is an
 * `AuthPayload { nonce, pubkeys: [primarySignerPubkey] }` ScMap matching the
 * smart-account's `__check_auth` expectation.
 *
 * Two simulate passes are required because a pre-auth first pass does not
 * actually execute `__check_auth` and therefore returns a footprint that
 * misses the smart-account's internal reads (nonce, signers, plugin address).
 * Submitting a transaction built from that incomplete footprint fails at
 * execution time with "trying to access contract instance outside of the
 * footprint". The second simulate, with the signed auth entries attached,
 * actually runs `__check_auth` and returns a complete footprint.
 */
export async function broadcastTransferXlm(
  input: BroadcastTransferInput,
): Promise<BroadcastOutcome> {
  if (input.amountStroops <= 0n) {
    return { success: false, error: "Amount must be greater than 0." };
  }
  if (input.primarySignerPubkey.length !== 32) {
    return { success: false, error: "Primary signer pubkey must be 32 bytes." };
  }

  try {
    const server = new rpc.Server(TESTNET_RPC);
    const ephemeral = Keypair.random();
    await fundEphemeral(ephemeral.publicKey());

    const fromSv = new Address(input.from).toScVal();
    const toSv = new Address(input.to).toScVal();
    const amountSv = nativeToScVal(input.amountStroops, { type: "i128" });

    const hostFunction = xdr.HostFunction.hostFunctionTypeInvokeContract(
      new xdr.InvokeContractArgs({
        contractAddress: new Address(TESTNET_XLM_SAC).toScAddress(),
        functionName: "transfer",
        args: [fromSv, toSv, amountSv],
      }),
    );

    // Pass 1: simulate without auth to discover the required auth entries.
    const source1 = await server.getAccount(ephemeral.publicKey());
    const tx1 = new TransactionBuilder(source1, {
      fee: BASE_FEE,
      networkPassphrase: TESTNET_PASSPHRASE,
    })
      .addOperation(Operation.invokeHostFunction({ func: hostFunction }))
      .setTimeout(60)
      .build();

    const sim1 = await server.simulateTransaction(tx1);
    if (rpc.Api.isSimulationError(sim1)) {
      return { success: false, error: sim1.error };
    }
    if (!rpc.Api.isSimulationSuccess(sim1)) {
      return { success: false, error: "Initial simulation returned no result." };
    }

    const authPayload = buildAuthPayloadScVal(input.accountNonce, input.primarySignerPubkey);
    const expirationLedger = sim1.latestLedger + 100;

    const simAuth = sim1.result?.auth ?? [];
    const signedAuth = await Promise.all(
      simAuth.map((entry) =>
        authorizeEntry(
          entry,
          async () => ({ signatureScVal: authPayload }),
          expirationLedger,
          TESTNET_PASSPHRASE,
          input.from,
        ),
      ),
    );

    // Pass 2: simulate with signed auth attached so `__check_auth` actually
    // runs and the returned footprint covers every ledger entry the broadcast
    // will touch.
    const source2 = await server.getAccount(ephemeral.publicKey());
    const tx2 = new TransactionBuilder(source2, {
      fee: BASE_FEE,
      networkPassphrase: TESTNET_PASSPHRASE,
    })
      .addOperation(Operation.invokeHostFunction({ func: hostFunction, auth: signedAuth }))
      .setTimeout(60)
      .build();

    const sim2 = await server.simulateTransaction(tx2);
    if (rpc.Api.isSimulationError(sim2)) {
      return { success: false, error: sim2.error };
    }
    if (!rpc.Api.isSimulationSuccess(sim2)) {
      return { success: false, error: "Auth-attached simulation returned no result." };
    }

    const assembled = rpc.assembleTransaction(tx2, sim2).build();
    assembled.sign(ephemeral);

    const sent = await server.sendTransaction(assembled);
    if (sent.status === "ERROR") {
      return {
        success: false,
        error: sent.errorResult
          ? `Submit failed: ${sent.errorResult.toXDR("base64")}`
          : "Submit failed.",
      };
    }

    await waitForInclusion(server, sent.hash);

    return {
      success: true,
      txHash: sent.hash,
      explorerUrl: `${EXPLORER_BASE}/tx/${sent.hash}`,
      nextAccountNonce: input.accountNonce + 1n,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Broadcast failed.",
    };
  }
}
