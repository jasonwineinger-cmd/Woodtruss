/** Metadata comparison only, not a manufacturer listing or capacity check. */
export type PlateFamily="integral-toothed"|"nail-applied"|"hinge";
export interface PlateUseBasis {
 use:"truss-member-joint"|"chord-end-hinge";
 species:string;
 grade:string;
 moistureAtAssembly:"dry"|"wet";
 serviceMoisture:"dry"|"wet";
 areaBasis:"gross"|"net";
 angleDatum:"plate-long-axis"|"plate-short-axis"|"wood-grain";
 angleSense:"clockwise"|"counterclockwise";
 faces:"single"|"paired-opposite";
}
export interface PlateReferenceIdentity {
 manufacturer:string;
 productCode:string;
 family:PlateFamily;
 issuer:string;
 documentId:string;
 revisedMonth:string;
 digestSha256:string;
 scope:string;
 locator:string;
 documentUrl:string;
}
export interface PlateReferenceEvidence {
 identity:PlateReferenceIdentity;
 basis:PlateUseBasis;
}
const identityKeys=["manufacturer","productCode","family","issuer","documentId","revisedMonth",
 "digestSha256","scope","locator","documentUrl"] as const;
const basisKeys=["use","species","grade","moistureAtAssembly","serviceMoisture","areaBasis",
 "angleDatum","angleSense","faces"] as const;
function exactKeys(value:unknown,keys:readonly string[]) {
 return typeof value==="object"&&value!==null&&Object.keys(value).length===keys.length&&
  keys.every(key=>Object.hasOwn(value,key));
}
const text=(value:unknown):value is string=>typeof value==="string"&&value.length>0&&
 value.length<=512&&value===value.trim()&&!/[\u0000-\u001f\u007f]/u.test(value);
const oneOf=(value:unknown,options:readonly string[])=>typeof value==="string"&&options.includes(value);
function documentUrl(value:string) {
 try{
  const url=new URL(value);
  return url.protocol==="https:"&&!!url.hostname&&!url.username&&!url.password&&!url.hash&&!url.search;
 }catch{return false;}
}
function assertEvidence(value:PlateReferenceEvidence) {
 if(!exactKeys(value,["identity","basis"])||!exactKeys(value.identity,identityKeys)||!exactKeys(value.basis,basisKeys))
  throw new Error("Unknown or missing plate reference metadata fields");
 const {identity:i,basis:b}=value;
 if(!identityKeys.every(key=>text(i[key]))||!oneOf(i.family,["integral-toothed","nail-applied","hinge"])||
    !/^\d{4}-(?:0[1-9]|1[0-2])$/u.test(i.revisedMonth)||!(/^[0-9a-f]{64}$/u.test(i.digestSha256))||
    !documentUrl(i.documentUrl))
  throw new Error("Invalid plate manufacturer or document identity");
 if(!text(b.species)||!text(b.grade)||!oneOf(b.use,["truss-member-joint","chord-end-hinge"])||
    !oneOf(b.moistureAtAssembly,["dry","wet"])||!oneOf(b.serviceMoisture,["dry","wet"])||
    !oneOf(b.areaBasis,["gross","net"])||!oneOf(b.angleDatum,["plate-long-axis","plate-short-axis","wood-grain"])||
    !oneOf(b.angleSense,["clockwise","counterclockwise"])||!oneOf(b.faces,["single","paired-opposite"])||
    ((i.family==="hinge")!==(b.use==="chord-end-hinge")))
  throw new Error("Invalid or inconsistent plate use and measurement basis");
}

/** Exact comparison with independently expected metadata. Syntax and equality
 * do not authenticate the bytes, certify applicability or approve a joint. */
export function comparePlateReferenceEvidence(expected:PlateReferenceEvidence,supplied:PlateReferenceEvidence) {
 assertEvidence(expected);
 assertEvidence(supplied);
 const mismatches=[
  ...identityKeys.filter(key=>expected.identity[key]!==supplied.identity[key]).map(key=>"identity."+key),
  ...basisKeys.filter(key=>expected.basis[key]!==supplied.basis[key]).map(key=>"basis."+key),
 ];
 return {status:mismatches.length?"REFERENCE_MISMATCH":"METADATA_MATCH_UNVERIFIED",
  mismatches,sourceVerified:false,capacityVerified:false,fabricationAuthorized:false,machineReleaseAuthorized:false} as const;
}
