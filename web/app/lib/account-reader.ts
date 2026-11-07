import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  rpc,
  scValToNative,
  TransactionBuilder,
  type xdr,
} from "@stellar/stellar-sdk";
import { SESSION_KEYS_CONTRACT_ID, TESTNET_PASSPHRASE, TESTNET_RPC } from "./factory-client";

/**
 * Native XLM Stellar Asset Contract on testnet. Derived from
 * `Asset.native().contractId(Networks.TESTNET)`; different from mainnet.
 * Any token held by a contract address lives in this SAC's storage, so
 * balance reads for a smart-account go through `balance(id: Address)` here
 * rather than Horizon.
 */
export const TESTNET_XLM_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export type AccountState = {
  address: string;
  xlmBalance: bigint | null;
  sessionKeysPlugin: string | null;
  expectedSessionKeysPlugin: string;
  pluginMatchesExpected: boolean;
};

async function simulateView(contractId: string, method: string, args: xdr.ScVal[]) {
  const server = new rpc.Server(TESTNET_RPC);
  const dummy = Keypair.random();
  const source = new Account(dummy.publicKey(), "0");
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: TESTNET_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
    return null;
  }
  return sim.result.retval;
}

async function readXlmBalance(accountAddress: string): Promise<bigint | null> {
  try {
    const addressScVal = new Address(accountAddress).toScVal();
    const retval = await simulateView(TESTNET_XLM_SAC, "balance", [addressScVal]);
    if (!retval) return null;
    const native = scValToNative(retval);
    return typeof native === "bigint" ? native : BigInt(native ?? 0);
  } catch {
    return null;
  }
}

async function readSessionKeysPlugin(accountAddress: string): Promise<string | null> {
  try {
    const retval = await simulateView(accountAddress, "session_keys_plugin", []);
    if (!retval) return null;
    const native = scValToNative(retval);
    if (native == null) return null;
    if (typeof native === "string") return native;
    if (native instanceof Address) return native.toString();
    return null;
  } catch {
    return null;
  }
}

export async function readAccountState(address: string): Promise<AccountState> {
  const [xlmBalance, sessionKeysPlugin] = await Promise.all([
    readXlmBalance(address),
    readSessionKeysPlugin(address),
  ]);

  return {
    address,
    xlmBalance,
    sessionKeysPlugin,
    expectedSessionKeysPlugin: SESSION_KEYS_CONTRACT_ID,
    pluginMatchesExpected: sessionKeysPlugin === SESSION_KEYS_CONTRACT_ID,
  };
}

/**
 * XLM stroops are stored as i128 with 7 decimal places. `12345000` stroops
 * is `1.2345 XLM`. Trailing zeros past the first decimal are trimmed so the
 * common case `0` renders as `0.0` and whole numbers do not show noise.
 */
export function formatXlm(stroops: bigint): string {
  const negative = stroops < 0n;
  const abs = negative ? -stroops : stroops;
  const whole = abs / 10_000_000n;
  const fractional = abs % 10_000_000n;
  const fractionalStr = fractional.toString().padStart(7, "0").replace(/0+$/, "");
  const decimalPart = fractionalStr.length > 0 ? `.${fractionalStr}` : ".0";
  return `${negative ? "-" : ""}${whole.toString()}${decimalPart}`;
}
