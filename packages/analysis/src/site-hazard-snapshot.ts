/** Offline metadata for a human-transcribed ASCE Hazard Tool PDF. The official
 * tool takes location, standard edition, risk category, and unit system:
 * https://www.asce.org/publications-and-news/asce-hazard-tool/about/
 * This module does not fetch or parse a report or authenticate its publisher. */
export interface SiteHazardBinding {
  projectId:string;
  siteId:string;
  latitude:number;
  longitude:number;
  edition:"7-10"|"7-16"|"7-22";
  riskCategory:"I"|"II"|"III"|"IV";
  units:"US customary"|"SI";
}

export interface SiteHazardSnapshot {
  binding:SiteHazardBinding;
  source:{
    publisher:"ASCE Hazard Tool";
    /** Local evidence identifier; not assumed to be issued by ASCE. */
    recordId:string;
    reportDate:string;
    fileSha256:string;
    transcriptionReference:string;
  };
  groundSnow:{kind:"ground-snow"; value:number; unit:"lb/ft²"|"kN/m²"};
}

const bindingKeys=["projectId","siteId","latitude","longitude","edition","riskCategory","units"] as const;
function objectWithKeys(value:unknown,keys:readonly string[]): Record<string,unknown> {
  if(!value||typeof value!=="object"||Array.isArray(value)||
     Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))
    throw new Error("Incomplete or unrecognized hazard snapshot fields");
  return value as Record<string,unknown>;
}
const label=(value:unknown):value is string=>typeof value==="string"&&value.trim()===value&&value.length>0;
const bounded=(value:unknown,limit:number):value is number=>
  typeof value==="number"&&Number.isFinite(value)&&Math.abs(value)<=limit;

function scope(value:unknown):SiteHazardBinding {
  const b=objectWithKeys(value,bindingKeys);
  if(!label(b.projectId)||!label(b.siteId)||!bounded(b.latitude,90)||!bounded(b.longitude,180)||
    (b.edition!=="7-10"&&b.edition!=="7-16"&&b.edition!=="7-22")||
    (b.riskCategory!=="I"&&b.riskCategory!=="II"&&b.riskCategory!=="III"&&b.riskCategory!=="IV")||
    (b.units!=="US customary"&&b.units!=="SI")) throw new Error("Invalid site hazard binding");
  return {projectId:b.projectId,siteId:b.siteId,latitude:b.latitude,longitude:b.longitude,
    edition:b.edition,riskCategory:b.riskCategory,units:b.units};
}

function reportDate(value:unknown):value is string {
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/u.test(value)||value.startsWith("0000"))return false;
  const date=new Date(value+"T00:00:00Z");
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}

/** Match the declared record to exact expected scope and recompute PDF byte
 * identity. Neither matching bytes nor input metadata verifies transcription
 * accuracy, site selection, code applicability, or design readiness. */
export async function intakeGroundSnowSnapshot(expected:SiteHazardBinding, raw:unknown, pdf:Uint8Array) {
  const verifiedScope=scope(expected);
  const fields=objectWithKeys(raw,["binding","source","groundSnow"]);
  const binding=scope(fields.binding);
  if(bindingKeys.some(key=>binding[key]!==verifiedScope[key]))
    throw new Error("Hazard snapshot does not match the exact expected project/site scope");

  const source=objectWithKeys(fields.source,["publisher","recordId","reportDate","fileSha256","transcriptionReference"]);
  if(source.publisher!=="ASCE Hazard Tool"||!label(source.recordId)||!reportDate(source.reportDate)||
     !label(source.transcriptionReference)||typeof source.fileSha256!=="string"||
     !/^[0-9a-f]{64}$/u.test(source.fileSha256))
    throw new Error("Invalid source report provenance");

  const snow=objectWithKeys(fields.groundSnow,["kind","value","unit"]);
  const unit=binding.units==="SI"?"kN/m²":"lb/ft²";
  if(snow.kind!=="ground-snow"||snow.unit!==unit||
     typeof snow.value!=="number"||!Number.isFinite(snow.value)||snow.value<0)
    throw new Error("Expected a resolved ground snow value in the bound report units, not roof snow");

  const frozenSource={publisher:source.publisher,recordId:source.recordId,reportDate:source.reportDate,
    fileSha256:source.fileSha256,transcriptionReference:source.transcriptionReference};
  const groundSnow={kind:"ground-snow" as const,value:snow.value,unit};
  if(!(pdf instanceof Uint8Array))throw new Error("Original PDF bytes required");
  const bytes=new Uint8Array(pdf);
  if(bytes.length<6||String.fromCharCode(...bytes.subarray(0,5))!=="%PDF-")
    throw new Error("Original PDF bytes required");
  const hash=Array.from(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256",bytes)),
    byte=>byte.toString(16).padStart(2,"0")).join("");
  if(hash!==frozenSource.fileSha256)throw new Error("Source PDF digest mismatch");
  return {
    binding,source:frozenSource,groundSnow,
    status:"PRELIMINARY_NOT_ENGINEERED" as const,
    reportBytesMatched:true as const,
    publisherAuthenticated:false as const,
    transcriptionVerified:false as const,
    roofSnowDerived:false as const,
    designApproved:false as const,
    manufacturingApproved:false as const,
  };
}
