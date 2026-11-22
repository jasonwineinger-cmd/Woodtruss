import { comparePlateReferenceEvidence, snapshotPlateReferenceEvidence } from "./plate-reference-evidence.js";

export interface AuthorizedPlateSourceArtifact {
 /** Caller-trusted explicit local review scope; not proof of legal permission. */
 purpose:"authorized-local-reference-review";
 sha256:string;
}
type Hold="MISSING_OR_INVALID_LOCAL_AUTHORIZATION"|"INVALID_REFERENCE_METADATA"|"REFERENCE_METADATA_MISMATCH"|
 "LOCAL_BYTES_UNAVAILABLE"|"DIGEST_UNAVAILABLE"|"LOCAL_BYTES_MISMATCH";
const maxSourceBytes=25*1024*1024;
const typedArrayPrototype=Object.getPrototypeOf(Uint8Array.prototype) as object;
const tag=Object.getOwnPropertyDescriptor(typedArrayPrototype,Symbol.toStringTag)!.get!;
const backing=Object.getOwnPropertyDescriptor(typedArrayPrototype,"buffer")!.get!;
const offset=Object.getOwnPropertyDescriptor(typedArrayPrototype,"byteOffset")!.get!;
const length=Object.getOwnPropertyDescriptor(typedArrayPrototype,"byteLength")!.get!;
const backingLength=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,"byteLength")!.get!;

function snapshotFields(input:unknown,required:readonly string[],optional:readonly string[]=[]) {
 if(!input||typeof input!=="object") throw new Error("Expected a plain record");
 const prototype=Object.getPrototypeOf(input);
 if(prototype!==Object.prototype&&prototype!==null) throw new Error("Expected own record fields");
 const fields=Object.create(null) as Record<string,unknown>;
 for(const key of Reflect.ownKeys(input)) {
  if(typeof key!=="string"||(!required.includes(key)&&!optional.includes(key))) throw new Error("Unexpected record fields");
  const descriptor=Object.getOwnPropertyDescriptor(input,key);
  if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value")) throw new Error("Expected enumerable data fields");
  fields[key]=descriptor.value;
 }
 if(!required.every(key=>Object.hasOwn(fields,key))) throw new Error("Missing record fields");
 return fields;
}

function copyLocalBytes(bytes:unknown): Uint8Array<ArrayBuffer>|null {
 try {
  if(!ArrayBuffer.isView(bytes)||tag.call(bytes)!=="Uint8Array") return null;
  const buffer=backing.call(bytes) as ArrayBuffer;
  const byteLength=length.call(bytes) as number;
  const byteOffset=offset.call(bytes) as number;
  // Unlike a property read, the ArrayBuffer intrinsic both ignores shadowed
  // metadata and rejects SharedArrayBuffer. A detached view cannot be copied.
  if(byteLength<1||byteLength>maxSourceBytes||byteOffset+byteLength>backingLength.call(buffer)) return null;
  return new Uint8Array(new Uint8Array(buffer,byteOffset,byteLength));
 }catch{return null;}
}
function result(hold:Hold|null) {
 return {
  status:hold===null?"EXACT_ARTIFACT_REVIEW_ONLY" as const:"HELD_UNVERIFIED" as const,
  hold,exactAuthorizedBytesMatched:hold===null,
  manufacturerSourceAuthenticated:false,applicabilityVerified:false,capacityVerified:false,
  engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false,
 };
}

/** Check only supplied original local bytes and independently expected metadata.
 * Does not fetch, parse, extract values, or verify an issuer signature. A
 * matching digest establishes identity with the authorized local copy only. */
export async function verifyLocalPlateSourceArtifact(
 expected:unknown,
 authorization:unknown,
 supplied:unknown,
) {
 let authorizedSha: string;
 try {
  const {purpose,sha256}=snapshotFields(authorization,["purpose","sha256"]);
  if(purpose!=="authorized-local-reference-review"||typeof sha256!=="string"||
     !/^[0-9a-f]{64}$/u.test(sha256)||/^0{64}$/u.test(sha256))
   return result("MISSING_OR_INVALID_LOCAL_AUTHORIZATION");
  authorizedSha=sha256;
 }catch{return result("MISSING_OR_INVALID_LOCAL_AUTHORIZATION");}
 let bytes:unknown;
 try{
  const envelope=snapshotFields(supplied,["reference"],["bytes"]);
  bytes=envelope.bytes;
  const expectedSnapshot=snapshotPlateReferenceEvidence(expected);
  const suppliedSnapshot=snapshotPlateReferenceEvidence(envelope.reference);
  if(comparePlateReferenceEvidence(expectedSnapshot,suppliedSnapshot).status!=="METADATA_MATCH_UNVERIFIED"||
     expectedSnapshot.identity.digestSha256!==authorizedSha)
   return result("REFERENCE_METADATA_MISMATCH");
 }catch{return result("INVALID_REFERENCE_METADATA");}
 // Copy only the genuine selected view, and finish all capture before any await.
 const owned=copyLocalBytes(bytes);
 if(!owned) return result("LOCAL_BYTES_UNAVAILABLE");
 try{
  const digest=await globalThis.crypto.subtle.digest("SHA-256",owned);
  const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
  if(hex!==authorizedSha)return result("LOCAL_BYTES_MISMATCH");
  return result(null);
 }catch{return result("DIGEST_UNAVAILABLE");}
}
