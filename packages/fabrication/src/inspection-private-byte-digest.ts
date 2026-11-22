const MAX_BYTES = 16 * 1024 * 1024;
const typedArray = Object.getPrototypeOf(Uint8Array.prototype) as object;
const tag = Object.getOwnPropertyDescriptor(typedArray, Symbol.toStringTag)!.get!;
const backing = Object.getOwnPropertyDescriptor(typedArray, "buffer")!.get!;
const offset = Object.getOwnPropertyDescriptor(typedArray, "byteOffset")!.get!;
const length = Object.getOwnPropertyDescriptor(typedArray, "byteLength")!.get!;
const arrayBufferLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength")!.get!;

/** Match one exact caller-supplied local view against an expected digest.
 * No I/O, attestation or authority beyond byte identity. */
export async function inspectionPrivateBytesMatch(expectedSha256: string, value: unknown): Promise<boolean> {
  if (typeof expectedSha256 !== "string" || expectedSha256.length !== 64 ||
      !/^[a-f0-9]{64}$/u.test(expectedSha256) || /^0{64}$/u.test(expectedSha256)) return false;
  try {
    // Intrinsics ignore shadowed properties; the ArrayBuffer getter rejects
    // shared backing. Empty or detached views cannot match.
    if (!ArrayBuffer.isView(value) || tag.call(value) !== "Uint8Array") return false;
    const buffer = backing.call(value) as ArrayBuffer;
    const byteLength = length.call(value) as number;
    const byteOffset = offset.call(value) as number;
    const backingLength = arrayBufferLength.call(buffer) as number;
    if (byteLength < 1 || byteLength > MAX_BYTES || byteOffset + byteLength > backingLength) return false;
    const snapshot = new Uint8Array(new Uint8Array(buffer, byteOffset, byteLength));
    const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", snapshot));
    return Array.from(digest, octet => octet.toString(16).padStart(2, "0")).join("") === expectedSha256;
  } catch {
    return false;
  }
}
