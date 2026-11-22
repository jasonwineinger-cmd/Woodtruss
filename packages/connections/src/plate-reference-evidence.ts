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
const fieldError=()=>new Error("Unknown or missing plate reference metadata fields");
function ownDataSnapshot<K extends string>(value:unknown,keys:readonly K[]):Record<K,unknown> {
 try {
  if(typeof value!=="object"||value===null) throw fieldError();
  const prototype=Object.getPrototypeOf(value);
  if(prototype!==Object.prototype&&prototype!==null) throw fieldError();
  const own=Reflect.ownKeys(value);
  if(own.length!==keys.length||!keys.every(key=>own.includes(key))) throw fieldError();
  const snapshot={} as Record<K,unknown>;
  for(const key of keys){
   const descriptor=Object.getOwnPropertyDescriptor(value,key);
   if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value")) throw fieldError();
   snapshot[key]=descriptor.value;
  }
  return snapshot;
 } catch {throw fieldError();}
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
/** Detach and validate exact metadata as plain data, without invoking accessors. */
export function snapshotPlateReferenceEvidence(value:unknown):PlateReferenceEvidence {
 const fields=ownDataSnapshot(value,["identity","basis"]);
 const i=ownDataSnapshot(fields.identity,identityKeys);
 const b=ownDataSnapshot(fields.basis,basisKeys);
 if(!identityKeys.every(key=>text(i[key]))||!oneOf(i.family,["integral-toothed","nail-applied","hinge"])||
    typeof i.revisedMonth!=="string"||!/^\d{4}-(?:0[1-9]|1[0-2])$/u.test(i.revisedMonth)||typeof i.digestSha256!=="string"||!/^[0-9a-f]{64}$/u.test(i.digestSha256)||
    /^0{64}$/u.test(i.digestSha256)||typeof i.documentUrl!=="string"||
    !documentUrl(i.documentUrl))
  throw new Error("Invalid plate manufacturer or document identity");
 if(!text(b.species)||!text(b.grade)||!oneOf(b.use,["truss-member-joint","chord-end-hinge"])||
    !oneOf(b.moistureAtAssembly,["dry","wet"])||!oneOf(b.serviceMoisture,["dry","wet"])||
    !oneOf(b.areaBasis,["gross","net"])||!oneOf(b.angleDatum,["plate-long-axis","plate-short-axis","wood-grain"])||
    !oneOf(b.angleSense,["clockwise","counterclockwise"])||!oneOf(b.faces,["single","paired-opposite"])||
    ((i.family==="hinge")!==(b.use==="chord-end-hinge")))
  throw new Error("Invalid or inconsistent plate use and measurement basis");
 return Object.freeze({identity:Object.freeze(i),basis:Object.freeze(b)}) as PlateReferenceEvidence;
}

/** Exact comparison with independently expected metadata. Syntax and equality
 * do not authenticate the bytes, certify applicability or approve a joint. */
export function comparePlateReferenceEvidence(expected:PlateReferenceEvidence,supplied:PlateReferenceEvidence) {
 const a=snapshotPlateReferenceEvidence(expected);
 const b=snapshotPlateReferenceEvidence(supplied);
 const mismatches=[
  ...identityKeys.filter(key=>a.identity[key]!==b.identity[key]).map(key=>"identity."+key),
  ...basisKeys.filter(key=>a.basis[key]!==b.basis[key]).map(key=>"basis."+key),
 ];
 return {status:mismatches.length?"REFERENCE_MISMATCH":"METADATA_MATCH_UNVERIFIED",
  mismatches,sourceVerified:false,capacityVerified:false,fabricationAuthorized:false,machineReleaseAuthorized:false} as const;
}
