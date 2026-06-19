import { describe, expect, it } from "vitest";
import { crc16Checksum, predictAccountAddress } from "@/lib/predict-address";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(str: string): Uint8Array {
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of str) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 0xff);
    }
  }

  return new Uint8Array(output);
}

function decodeCAddress(address: string): {
  version: number;
  payload: Uint8Array;
  checksumValid: boolean;
} {
  const decoded = base32Decode(address);
  const version = decoded[0];
  const payload = decoded.slice(1, 33);
  const checksum = decoded[33] | (decoded[34] << 8);
  const computed = crc16Checksum(payload);
  return { version, payload, checksumValid: checksum === computed };
}

const TEST_CREDENTIAL_ID = "AQIDBAUGBwgJAAECAwQFBgcICQAB";
const TEST_CREDENTIAL_ID_2 = "BQYHCAkICQoLDA0ODxA";

describe("predictAccountAddress", () => {
  it("is deterministic — same input produces same output", async () => {
    const a = await predictAccountAddress(TEST_CREDENTIAL_ID);
    const b = await predictAccountAddress(TEST_CREDENTIAL_ID);
    expect(a).toBe(b);
  });

  it("produces the expected address for a known credential ID", async () => {
    const address = await predictAccountAddress(TEST_CREDENTIAL_ID);
    expect(address).toBe("CCVMGUBX46CYWVBW7SWQLVBFBKAY3T4GRTYRTHBZSW64X4XJDYNFFANF");
  });

  it("different inputs produce different addresses", async () => {
    const a = await predictAccountAddress(TEST_CREDENTIAL_ID);
    const b = await predictAccountAddress(TEST_CREDENTIAL_ID_2);
    expect(a).not.toBe(b);
  });

  it("output is a valid C-address with correct version byte and CRC16", async () => {
    const address = await predictAccountAddress(TEST_CREDENTIAL_ID);
    const { version, payload, checksumValid } = decodeCAddress(address);

    expect(version).toBe(0x10);
    expect(payload.length).toBe(32);
    expect(checksumValid).toBe(true);
  });

  it("output matches the /^[A-Z2-7]{56}$/ pattern used in e2e tests", async () => {
    const address = await predictAccountAddress(TEST_CREDENTIAL_ID);
    expect(address).toMatch(/^[A-Z2-7]{56}$/);
  });
});
