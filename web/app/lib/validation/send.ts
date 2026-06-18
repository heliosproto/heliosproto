import { z } from "zod";

const STRKEY_LENGTH = 56;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Decode a Crockford/RFC4648 base32 string (no padding) into bytes. */
function base32Decode(input: string): Uint8Array | null {
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of input) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      return null;
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 0xff);
    }
  }

  return new Uint8Array(output);
}

/** CRC16-XModem, as used by Stellar StrKey. */
function crc16XModem(bytes: Uint8Array): number {
  let crc = 0x0000;
  for (const byte of bytes) {
    let code = (crc >>> 8) & 0xff;
    code ^= byte & 0xff;
    code ^= code >>> 4;
    crc = (crc << 8) & 0xffff;
    crc ^= code;
    code = (code << 5) & 0xffff;
    crc ^= code;
    code = (code << 2) & 0xffff;
    crc ^= code;
  }
  return crc & 0xffff;
}


export function isValidStrKey(address: string, prefixes: readonly string[]): boolean {
  if (address.length !== STRKEY_LENGTH) {
    return false;
  }
  if (!prefixes.includes(address[0])) {
    return false;
  }

  const decoded = base32Decode(address);
  // 56 base32 chars -> 35 bytes: 1 version + 32 payload + 2 checksum.
  if (decoded === null || decoded.length !== 35) {
    return false;
  }

  const payload = decoded.subarray(0, decoded.length - 2);
  const checksum = decoded.subarray(decoded.length - 2);
  const expected = crc16XModem(payload);

  // Checksum is stored little-endian.
  const actual = checksum[0] | (checksum[1] << 8);
  return actual === expected;
}

/** Accepts both account (`G…`) and contract (`C…`) StrKeys. */
export const recipientSchema = z
  .string()
  .min(1, "Recipient is required")
  .refine((val) => isValidStrKey(val, ["G", "C"]), {
    message: "Must be a valid Stellar address (G… or C…)",
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
