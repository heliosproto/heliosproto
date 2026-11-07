import { describe, expect, it } from "vitest";
import {
  amountSchema,
  isValidStrKey,
  memoSchema,
  recipientSchema,
  sendSchema,
} from "@/lib/validation/send";

// Real, checksum-valid StrKeys from actual testnet deployments.
const VALID_G = "GBWUF6VB7ZLK5EZI46SSPNNVWOM4X3X64KQYN6BCVILFD3AQMAIETKMC";
const VALID_C = "CDF4P7N4QGYOH4NYSTJR4SJFE5SQXGD2LXSNBQWMI5MOS35KLCNUGU2S";

describe("isValidStrKey", () => {
  it("accepts a well-formed G address", () => {
    expect(isValidStrKey(VALID_G, ["G", "C"])).toBe(true);
  });

  it("accepts a well-formed C address", () => {
    expect(isValidStrKey(VALID_C, ["G", "C"])).toBe(true);
  });

  it("rejects a wrong prefix", () => {
    expect(isValidStrKey(VALID_G, ["C"])).toBe(false);
  });

  it("rejects a bad checksum (single flipped character)", () => {
    // Flip a payload byte so the CRC no longer matches. Keep the length and
    // the G prefix so the only error is the checksum.
    const flipped = `${VALID_G.slice(0, 5)}X${VALID_G.slice(6)}`;
    expect(isValidStrKey(flipped, ["G", "C"])).toBe(false);
  });

  it("rejects the wrong length", () => {
    expect(isValidStrKey(VALID_G.slice(0, 55), ["G", "C"])).toBe(false);
  });

  it("rejects invalid base32 characters", () => {
    const withZero = `G0${VALID_G.slice(2)}`; // 0 and 1 are not in the alphabet
    expect(isValidStrKey(withZero, ["G", "C"])).toBe(false);
  });

  it("rejects lowercase", () => {
    expect(isValidStrKey(VALID_G.toLowerCase(), ["G", "C"])).toBe(false);
  });
});

describe("recipientSchema", () => {
  it("rejects empty recipient", () => {
    expect(recipientSchema.safeParse("").success).toBe(false);
  });

  it("rejects a malformed address", () => {
    expect(recipientSchema.safeParse("not-an-address").success).toBe(false);
  });

  it("accepts a well-formed G address", () => {
    expect(recipientSchema.safeParse(VALID_G).success).toBe(true);
  });

  it("accepts a well-formed C address", () => {
    expect(recipientSchema.safeParse(VALID_C).success).toBe(true);
  });
});

describe("amountSchema", () => {
  it("rejects empty amount", () => {
    expect(amountSchema.safeParse("").success).toBe(false);
  });

  it("rejects a negative amount", () => {
    expect(amountSchema.safeParse("-5").success).toBe(false);
  });

  it("rejects zero", () => {
    expect(amountSchema.safeParse("0").success).toBe(false);
  });

  it("rejects more than 7 decimal places", () => {
    expect(amountSchema.safeParse("1.12345678").success).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(amountSchema.safeParse("abc").success).toBe(false);
  });

  it("accepts a positive integer", () => {
    expect(amountSchema.safeParse("10").success).toBe(true);
  });

  it("accepts exactly 7 decimal places", () => {
    expect(amountSchema.safeParse("1.1234567").success).toBe(true);
  });
});

describe("memoSchema", () => {
  it("accepts an undefined memo", () => {
    expect(memoSchema.safeParse(undefined).success).toBe(true);
  });

  it("accepts a 28-character memo", () => {
    expect(memoSchema.safeParse("a".repeat(28)).success).toBe(true);
  });

  it("rejects a memo over 28 characters", () => {
    expect(memoSchema.safeParse("a".repeat(29)).success).toBe(false);
  });
});

describe("sendSchema", () => {
  it("accepts a fully valid payload", () => {
    const result = sendSchema.safeParse({
      recipient: VALID_G,
      asset: "XLM",
      amount: "12.5",
      memo: "invoice 42",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid payload without a memo", () => {
    const result = sendSchema.safeParse({
      recipient: VALID_C,
      asset: "TEST",
      amount: "1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown asset", () => {
    const result = sendSchema.safeParse({
      recipient: VALID_G,
      asset: "DOGE",
      amount: "1",
    });
    expect(result.success).toBe(false);
  });

  it("collects errors for multiple invalid fields", () => {
    const result = sendSchema.safeParse({
      recipient: "bad",
      asset: "XLM",
      amount: "-1",
      memo: "x".repeat(40),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain("recipient");
      expect(fields).toContain("amount");
      expect(fields).toContain("memo");
    }
  });
});
