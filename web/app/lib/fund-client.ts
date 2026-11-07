import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { TESTNET_XLM_SAC } from "./account-reader";
import { EXPLORER_BASE, FRIENDBOT_URL, TESTNET_PASSPHRASE, TESTNET_RPC } from "./factory-client";

export type FundResult = {
  sourceAddress: string;
  txHash: string;
  explorerUrl: string;
  amountStroops: bigint;
};

async function waitForTransaction(
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
      throw new Error(`Funding tx ${hash} failed on-chain.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Funding tx ${hash} not confirmed within 60s.`);
}

/**
 * Move testnet XLM into a smart-account by:
 *   1. Generating an ephemeral Stellar keypair (G-address)
 *   2. Funding that G-address via testnet friendbot
 *   3. Calling native XLM SAC `transfer(G, smart_account, amount)` with G as both
 *      the Soroban source (for fee + auth) and the `from`
 *
 * The ephemeral keypair is discarded after the transfer. Smart-account's XLM
 * balance (visible via the native SAC `balance(id)` view) will reflect the
 * transferred amount once the transaction is included.
 */
export async function fundSmartAccountFromFriendbot(
  smartAccountAddress: string,
  amountXlm = 1000,
): Promise<FundResult> {
  if (amountXlm <= 0) {
    throw new Error("amountXlm must be positive");
  }
  const amountStroops = BigInt(amountXlm) * 10_000_000n;

  const ephemeral = Keypair.random();
  const friendbotRes = await fetch(
    `${FRIENDBOT_URL}?addr=${encodeURIComponent(ephemeral.publicKey())}`,
  );
  if (!friendbotRes.ok && friendbotRes.status !== 400) {
    throw new Error(`Friendbot funding failed with status ${friendbotRes.status}`);
  }

  const server = new rpc.Server(TESTNET_RPC);
  const sourceAccount = await server.getAccount(ephemeral.publicKey());

  const xlmSac = new Contract(TESTNET_XLM_SAC);
  const operation = xlmSac.call(
    "transfer",
    new Address(ephemeral.publicKey()).toScVal(),
    new Address(smartAccountAddress).toScVal(),
    nativeToScVal(amountStroops, { type: "i128" }),
  );

  const unsigned = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: TESTNET_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(unsigned);
  prepared.sign(ephemeral);

  const sent = await server.sendTransaction(prepared);
  if (sent.status === "ERROR") {
    throw new Error("Failed to submit funding transaction to Soroban RPC.");
  }

  await waitForTransaction(server, sent.hash);

  return {
    sourceAddress: ephemeral.publicKey(),
    txHash: sent.hash,
    explorerUrl: `${EXPLORER_BASE}/tx/${sent.hash}`,
    amountStroops,
  };
}
