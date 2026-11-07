import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { TESTNET_XLM_SAC } from "./account-reader";
import { TESTNET_PASSPHRASE, TESTNET_RPC } from "./factory-client";

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
