type PlateScheduleRow={
 rowId:string;
 jointId:string;
 faceId:string;
 manufacturer:string;
 partDesignation:string;
 sourceLocator:string;
 observation:{state:"observed";lengthIn:number;widthIn:number}|{state:"unresolved";lengthIn:null;widthIn:null};
};
export interface PlateScheduleEvidence {
 revision:string;
 documentSha256:string;
 units:"in";
 rows:readonly PlateScheduleRow[];
}
type Hold="SCHEDULE_INPUT_UNVERIFIED"|"SCHEDULE_SOURCE_MISMATCH"|"SCHEDULE_ROWS_MISMATCH"|"OBSERVATIONS_UNRESOLVED";
function result(hold:Hold|null,matchedRows=0,unresolvedRows=0){
 return {status:hold?"HELD_UNVERIFIED" as const:"SCHEDULE_EVIDENCE_REVIEW_ONLY" as const,
  hold,matchedRows,unresolvedRows,manufacturerSourceAuthenticated:false,oppositeFaceInferred:false,
  platePlacementApproved:false,capacityVerified:false,engineeringApproved:false,
  fabricationAuthorized:false,machineReleaseAuthorized:false};
}
const recordKeys=["revision","documentSha256","units","rows"];
const rowKeys=["rowId","jointId","faceId","manufacturer","partDesignation","sourceLocator","observation"];
const observationKeys=["state","lengthIn","widthIn"];
const exactKeys=(record:unknown,keys:readonly string[])=>typeof record==="object"&&record!==null&&
 Object.keys(record).length===keys.length&&keys.every(key=>Object.hasOwn(record,key));
const text=(value:unknown):value is string=>typeof value==="string"&&value.length>0&&value.length<=256&&
 value===value.trim()&&!/[\u0000-\u001f\u007f]/u.test(value);
const positive=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)&&value>0;
function valid(record:PlateScheduleEvidence|null){
 if(!record||!exactKeys(record,recordKeys)||!text(record.revision)||
    typeof record.documentSha256!=="string"||!/^[0-9a-f]{64}$/u.test(record.documentSha256)||record.units!=="in"||
    !Array.isArray(record.rows)||!record.rows.length||record.rows.length>500)return false;
 const seen=new Set<string>(),located=new Set<string>();
 for(const row of record.rows){
  if(!row||!exactKeys(row,rowKeys)||!rowKeys.slice(0,-1).every(key=>text(row[key as keyof PlateScheduleRow]))||
     !exactKeys(row.observation,observationKeys)||seen.has(row.rowId))return false;
  const location=JSON.stringify([row.jointId,row.faceId,row.sourceLocator]);
  if(located.has(location))return false;
  seen.add(row.rowId);located.add(location);
  const o=row.observation;
  if(o.state==="observed"?(!positive(o.lengthIn)||!positive(o.widthIn)):
    (o.state!=="unresolved"||o.lengthIn!==null||o.widthIn!==null))return false;
 }
 return true;
}

/** Reconcile separately recorded drawing schedule evidence. This does not
 * read a document, authenticate its manufacturer, verify physical dimensions,
 * infer paired faces, or select a part. Returns no raw input evidence. */
export function comparePlateScheduleEvidence(expected:PlateScheduleEvidence|null,supplied:PlateScheduleEvidence|null){
 if(!expected||!supplied||!valid(expected)||!valid(supplied))return result("SCHEDULE_INPUT_UNVERIFIED");
 if(expected.revision!==supplied.revision||expected.documentSha256!==supplied.documentSha256)
  return result("SCHEDULE_SOURCE_MISMATCH");
 const byId=new Map(supplied.rows.map(row=>[row.rowId,row]));
 if(expected.rows.length!==byId.size)return result("SCHEDULE_ROWS_MISMATCH");
 let unresolved=0;
 for(const row of expected.rows){
  const seen=byId.get(row.rowId);
  if(!seen||seen.jointId!==row.jointId||seen.faceId!==row.faceId||seen.manufacturer!==row.manufacturer||
    seen.partDesignation!==row.partDesignation||seen.sourceLocator!==row.sourceLocator||
    seen.observation.state!==row.observation.state||seen.observation.lengthIn!==row.observation.lengthIn||
    seen.observation.widthIn!==row.observation.widthIn)return result("SCHEDULE_ROWS_MISMATCH");
  if(row.observation.state==="unresolved")unresolved++;
 }
 return result(unresolved?"OBSERVATIONS_UNRESOLVED":null,expected.rows.length,unresolved);
}
