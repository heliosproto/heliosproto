import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  rpc,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

export const TESTNET_RPC = "https://soroban-testnet.stellar.org";
export const TESTNET_PASSPHRASE = Networks.TESTNET;
export const FACTORY_CONTRACT_ID = "CDF4P7N4QGYOH4NYSTJR4SJFE5SQXGD2LXSNBQWMI5MOS35KLCNUGU2S";
export const SESSION_KEYS_CONTRACT_ID = "CCT6CXGBMVTCN62JDEIU5O3SXJI3R7KTWOPC5F2MSGINCTPUYXKKURNH";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";
export const EXPLORER_BASE = "https://stellar.expert/explorer/testnet";

export type DeployResult = {
  address: string;
  txHash: string;
  explorerUrl: string;
};

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function fundEphemeral(address: string): Promise<void> {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`);
  if (!res.ok && res.status !== 400) {
    throw new Error(`Friendbot funding failed with status ${res.status}`);
  }
}

async function waitForTransaction(
  server: rpc.Server,
  hash: string,
): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  const deadline = Date.now() + 45_000;
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
  throw new Error(`Transaction ${hash} not confirmed within 45s.`);
}

/**
 * Deploy a smart-account on Soroban testnet via the Helios factory.
 *
 * Uses an ephemeral Stellar keypair funded by the testnet friendbot to pay
 * fees. The deployed smart-account is controlled by the passkey represented
 * by `credentialIdBase64` and `pubkey`. The ephemeral keypair never signs
 * for the smart-account itself; it only sponsors the deployment transaction.
 */
export async function deployAccountOnTestnet(
  credentialIdBase64: string,
  pubkey: Uint8Array,
): Promise<DeployResult> {
  if (pubkey.length !== 32) {
    throw new Error(`pubkey must be 32 bytes (got ${pubkey.length})`);
  }

  const credentialBytes = base64ToBytes(credentialIdBase64);
  const ephemeral = Keypair.random();
  await fundEphemeral(ephemeral.publicKey());

  const server = new rpc.Server(TESTNET_RPC);
  const sourceAccount = await server.getAccount(ephemeral.publicKey());

  const factory = new Contract(FACTORY_CONTRACT_ID);
  const operation = factory.call(
    "deploy_account",
    xdr.ScVal.scvBytes(Buffer.from(credentialBytes)),
    xdr.ScVal.scvBytes(Buffer.from(pubkey)),
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
    throw new Error("Failed to submit transaction to Soroban RPC.");
  }

  const confirmed = await waitForTransaction(server, sent.hash);
  const returnValue = confirmed.returnValue;
  if (!returnValue) {
    throw new Error("Transaction succeeded but returned no value.");
  }

  const address = Address.fromScVal(returnValue).toString();
  return {
    address,
    txHash: sent.hash,
    explorerUrl: `${EXPLORER_BASE}/contract/${address}`,
  };
}

/**
 * Hash a credential ID (base64) with SHA-256 to produce a 32-byte stand-in
 * for the smart-account's authorized passkey public key.
 *
 * The real WebAuthn ES256 pubkey is 64 bytes uncompressed; the current
 * smart-account `Signer.key` field is `BytesN<32>`. Reconciling that is
 * a planned near-term change; until then this stable derivation lets us
 * exercise the full deploy path end-to-end.
 */
export async function mockPubkeyFromCredential(credentialIdBase64: string): Promise<Uint8Array> {
  const credentialBytes = base64ToBytes(credentialIdBase64);
  const digest = await crypto.subtle.digest("SHA-256", credentialBytes.buffer as ArrayBuffer);
  return new Uint8Array(digest);
}
