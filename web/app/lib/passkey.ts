const RP_NAME = "Helios Wallet";
const RP_ID = typeof window !== "undefined" ? window.location.hostname : "localhost";

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface PasskeyCredential {
  credentialId: string;
  publicKey: string;
}

export async function createPasskey(): Promise<PasskeyCredential> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const userId = crypto.getRandomValues(new Uint8Array(32));

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: RP_NAME,
      id: RP_ID,
    },
    user: {
      id: userId,
      name: "helios-wallet-user",
      displayName: "Helios Wallet User",
    },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
    timeout: 60000,
    attestation: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
    },
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  });

  if (!credential) {
    throw new Error("Passkey creation was cancelled");
  }

  const webAuthnCredential = credential as PublicKeyCredential & {
    response: AuthenticatorAttestationResponse;
  };

  const credentialId = bufferToBase64(webAuthnCredential.rawId);
  const publicKeyBuffer = webAuthnCredential.response.getPublicKey();
  if (!publicKeyBuffer) {
    throw new Error("No public key returned from authenticator");
  }

  const publicKey = bufferToBase64(publicKeyBuffer);

  return { credentialId, publicKey };
}

export function truncatePublicKey(publicKey: string, chars = 8): string {
  if (publicKey.length <= chars * 2) {
    return publicKey;
  }
  return `${publicKey.slice(0, chars)}...${publicKey.slice(-chars)}`;
}

export { base64ToBuffer, bufferToBase64 };
