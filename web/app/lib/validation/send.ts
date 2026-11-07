import { StrKey } from "@stellar/stellar-sdk";
import { z } from "zod";

/**
 * Validate a Stellar StrKey against one or more allowed prefixes
 * (G for classic accounts, C for Soroban contracts). Delegates to the
 * stellar-sdk's StrKey module, which is the authoritative implementation of
 * the base32 + CRC16-XModem scheme used across the Stellar network.
 */
export function isValidStrKey(address: string, prefixes: readonly string[]): boolean {
  for (const prefix of prefixes) {
    if (prefix === "G" && StrKey.isValidEd25519PublicKey(address)) {
      return true;
    }
    if (prefix === "C" && StrKey.isValidContract(address)) {
      return true;
    }
  }
  return false;
}

/** Accepts both account (`G...`) and contract (`C...`) StrKeys. */
export const recipientSchema = z
  .string()
  .min(1, "Recipient is required")
  .refine((val) => isValidStrKey(val, ["G", "C"]), {
    message: "Must be a valid Stellar address (G... or C...)",
  });

/** Supported assets for this issue: native XLM and a hardcoded test token. */
export const ASSETS = [
  { code: "XLM", label: "XLM (native)" },
  { code: "TEST", label: "TEST (test token)" },
] as const;

export type AssetCode = (typeof ASSETS)[number]["code"];

const assetCodes = ASSETS.map((a) => a.code) as [AssetCode, ...AssetCode[]];

export const assetSchema = z.enum(assetCodes);

/** Stellar amounts allow at most 7 decimal places and must be positive. */
const AMOUNT_REGEX = /^\d+(\.\d{1,7})?$/;

export const amountSchema = z
  .string()
  .min(1, "Amount is required")
  .refine((val) => AMOUNT_REGEX.test(val), {
    message: "Amount must be a number with at most 7 decimal places",
  })
  .refine((val) => Number(val) > 0, {
    message: "Amount must be greater than 0",
  });

/** Stellar text memos are capped at 28 bytes. */
export const MEMO_MAX_LENGTH = 28;

export const memoSchema = z
  .string()
  .max(MEMO_MAX_LENGTH, `Memo must be ${MEMO_MAX_LENGTH} characters or fewer`)
  .optional();

export const sendSchema = z.object({
  recipient: recipientSchema,
  asset: assetSchema,
  amount: amountSchema,
  memo: memoSchema,
});

export type SendFormValues = z.infer<typeof sendSchema>;
