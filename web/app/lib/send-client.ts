import {
  Account,
  Address,
  authorizeEntry,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
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
 * The smart-account's auth logic does not verify ECDSA/Ed25519 signatures
 * over the signature_payload; it checks that each pubkey in the AuthPayload
 * is in the stored signers set, and that the embedded nonce matches the
 * account's stored nonce. The ephemeral Stellar source account only pays
 * the transaction fee and signs the outer envelope; it does not authorize
 * the `from` of the inner transfer.
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
    const source = await server.getAccount(ephemeral.publicKey());

    const fromSv = new Address(input.from).toScVal();
    const toSv = new Address(input.to).toScVal();
    const amountSv = nativeToScVal(input.amountStroops, { type: "i128" });

    const xlmSac = new Contract(TESTNET_XLM_SAC);
    const op = xlmSac.call("transfer", fromSv, toSv, amountSv);

    const unsigned = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: TESTNET_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(60)
      .build();

    const sim = await server.simulateTransaction(unsigned);
    if (rpc.Api.isSimulationError(sim)) {
      return { success: false, error: sim.error };
    }
    if (!rpc.Api.isSimulationSuccess(sim)) {
      return { success: false, error: "Simulation returned no result." };
    }

    const authPayload = buildAuthPayloadScVal(input.accountNonce, input.primarySignerPubkey);
    const expirationLedger = sim.latestLedger + 100;

    const simAuth = sim.result?.auth ?? [];
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

    const patchedSim: rpc.Api.SimulateTransactionSuccessResponse = {
      ...sim,
      result: sim.result ? { ...sim.result, auth: signedAuth } : sim.result,
    };

    const assembled = rpc.assembleTransaction(unsigned, patchedSim).build();
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
