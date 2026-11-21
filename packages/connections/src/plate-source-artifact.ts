import { comparePlateReferenceEvidence, type PlateReferenceEvidence } from "./plate-reference-evidence.js";

export interface AuthorizedPlateSourceArtifact {
 /** Caller-trusted explicit local review scope; not proof of legal permission. */
 purpose:"authorized-local-reference-review";
 sha256:string;
}
type Hold="MISSING_OR_INVALID_LOCAL_AUTHORIZATION"|"INVALID_REFERENCE_METADATA"|"REFERENCE_METADATA_MISMATCH"|
 "LOCAL_BYTES_UNAVAILABLE"|"DIGEST_UNAVAILABLE"|"LOCAL_BYTES_MISMATCH";
const maxSourceBytes=25*1024*1024;
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
 expected:PlateReferenceEvidence,
 authorization:AuthorizedPlateSourceArtifact|null,
 supplied:{reference:PlateReferenceEvidence;bytes?:Uint8Array},
) {
 const authorizedSha=authorization?.sha256;
 if(authorization?.purpose!=="authorized-local-reference-review"||
    typeof authorizedSha!=="string"||!/^[0-9a-f]{64}$/u.test(authorizedSha))
  return result("MISSING_OR_INVALID_LOCAL_AUTHORIZATION");
 try{
  if(comparePlateReferenceEvidence(expected,supplied.reference).status!=="METADATA_MATCH_UNVERIFIED"||
     expected.identity.digestSha256!==authorizedSha)
   return result("REFERENCE_METADATA_MISMATCH");
 }catch{return result("INVALID_REFERENCE_METADATA");}
 const bytes=supplied.bytes;
 if(!(bytes instanceof Uint8Array)||bytes.byteLength===0||bytes.byteLength>maxSourceBytes)
  return result("LOCAL_BYTES_UNAVAILABLE");
 try{
  // Copy the selected view, not its whole backing buffer. Snapshot before awaiting.
  const owned=new Uint8Array(bytes);
  const digest=await globalThis.crypto.subtle.digest("SHA-256",owned);
  const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
  if(hex!==authorizedSha)return result("LOCAL_BYTES_MISMATCH");
  return result(null);
 }catch{return result("DIGEST_UNAVAILABLE");}
}
