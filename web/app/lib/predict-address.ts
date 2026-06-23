const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const CONTRACT_VERSION_BYTE = 0x10;

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

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function encodeCAddress(payload: Uint8Array): string {
  if (payload.length !== 32) {
    throw new Error("Contract address payload must be 32 bytes");
  }

  const versionPayload = new Uint8Array(1 + 32);
  versionPayload[0] = CONTRACT_VERSION_BYTE;
  versionPayload.set(payload, 1);

  const checksum = crc16XModem(versionPayload);
  const full = new Uint8Array(1 + 32 + 2);
  full.set(versionPayload);
  full[33] = checksum & 0xff;
  full[34] = (checksum >>> 8) & 0xff;

  return base32Encode(full);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function crc16Checksum(payload: Uint8Array): number {
  const versionPayload = new Uint8Array(1 + 32);
  versionPayload[0] = CONTRACT_VERSION_BYTE;
  versionPayload.set(payload, 1);
  return crc16XModem(versionPayload);
}

/**
 * Predict the deterministic smart-account address for a given credential ID.
 *
 * This mirrors the factory contract's `predict_address` logic.
 * Uses SHA-256 of the credential ID bytes to derive the 32-byte contract hash,
 * then encodes it as a Stellar C-address (StrKey format).
 *
 * NOTE: This derivation must be kept in sync with the factory contract
 * (issue 014) once that contract is implemented.
 */
export async function predictAccountAddress(credentialIdBase64: string): Promise<string> {
  const credentialBytes = base64ToBytes(credentialIdBase64);
  const hashBuffer = await crypto.subtle.digest("SHA-256", credentialBytes.buffer as ArrayBuffer);
  const hash = new Uint8Array(hashBuffer);

  return encodeCAddress(hash);
}
