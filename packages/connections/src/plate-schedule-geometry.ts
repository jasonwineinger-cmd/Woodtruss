import {comparePlateScheduleEvidence,type PlateScheduleEvidence} from "./plate-schedule-evidence.js";
import {reviewPlateFootprint,type ExplicitJointFace,type ExplicitPlateOutline} from "./plate-footprint-review.js";

export interface ExpectedSchedulePlacement {
 rowId:string;
 /** Independent face-outline evidence identifier, not a typical detail callout. */
 witnessId:string;
 face:ExplicitJointFace;
 lengthAxis:"local-x"|"local-y";
}
export interface SuppliedSchedulePlacement {
 rowId:string;
 witnessId:string;
 outline:ExplicitPlateOutline;
 lengthAxis:"local-x"|"local-y";
}
type Hold="SCHEDULE_UNVERIFIED"|"WITNESS_SCOPE_UNVERIFIED"|"OUTLINE_UNVERIFIED"|"PROJECTED_DIMENSIONS_MISMATCH";
function result(hold:Hold|null,matchedRows=0){
 return {status:hold?"HELD_UNVERIFIED" as const:"SCHEDULE_PROJECTION_REVIEW_ONLY" as const,hold,matchedRows,
  oppositeFaceInferred:false,physicalDimensionsVerified:false,platePlacementApproved:false,capacityVerified:false,
  engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false};
}
const label=(value:unknown)=>typeof value==="string"&&value.length>0&&value.trim()===value&&value.length<=256;
function byPlacement<T extends {rowId:string;witnessId:string}>(rows:readonly T[]){
 if(!Array.isArray(rows))return null;
 const map=new Map<string,T>(),witnesses=new Set<string>();
 for(const row of rows){
  if(!row||!label(row.rowId)||!label(row.witnessId)||map.has(row.rowId)||witnesses.has(row.witnessId))return null;
  map.set(row.rowId,row);witnesses.add(row.witnessId);
 }
 return map;
}

/** A drawing schedule callout may repeat across joints; it cannot stand in for
 * each joint's separately expected outline witness. Compare only explicit
 * local-axis projected extents, not actual dimensions, fit, or approved use. */
export function reviewPlateScheduleGeometry(expected:PlateScheduleEvidence,supplied:PlateScheduleEvidence,
 expectedPlacements:readonly ExpectedSchedulePlacement[],suppliedPlacements:readonly SuppliedSchedulePlacement[]){
 if(comparePlateScheduleEvidence(expected,supplied).status!=="SCHEDULE_EVIDENCE_REVIEW_ONLY")
  return result("SCHEDULE_UNVERIFIED");
 if(expectedPlacements?.length!==expected.rows.length||suppliedPlacements?.length!==expected.rows.length)
  return result("WITNESS_SCOPE_UNVERIFIED");
 const left=byPlacement(expectedPlacements),right=byPlacement(suppliedPlacements);
 if(!left||!right)return result("WITNESS_SCOPE_UNVERIFIED");
 for(const row of expected.rows){
  const a=left.get(row.rowId),b=right.get(row.rowId);
  if(!a?.face||!b?.outline||a.witnessId!==b.witnessId||
     (a.lengthAxis!=="local-x"&&a.lengthAxis!=="local-y")||a.lengthAxis!==b.lengthAxis||
     a.face.jointId!==row.jointId||a.face.faceId!==row.faceId||a.face.revision!==expected.revision)
   return result("WITNESS_SCOPE_UNVERIFIED");
  const outline=reviewPlateFootprint(a.face,b.outline);
  if(outline.hold)return result("OUTLINE_UNVERIFIED");
  const xs=b.outline.vertices.map(point=>point.x),ys=b.outline.vertices.map(point=>point.y);
  const x=Math.max(...xs)-Math.min(...xs),y=Math.max(...ys)-Math.min(...ys);
  const length=a.lengthAxis==="local-x"?x:y,width=a.lengthAxis==="local-x"?y:x;
  if(row.observation.state!=="observed"||row.observation.lengthIn!==length||row.observation.widthIn!==width)
   return result("PROJECTED_DIMENSIONS_MISMATCH");
 }
 return result(null,expected.rows.length);
}
