import {reviewPlateCoverageConflicts} from "./plate-coverage-conflicts.js";
import {reviewPlateMemberOverlap,type ExplicitMemberProjection} from "./plate-member-overlap-review.js";
import {reviewPlateFootprint,type ExplicitJointFace,type ExplicitPlateOutline} from "./plate-footprint-review.js";

type Hold="FACE_OR_PLATE_UNVERIFIED"|"PLATE_OUTSIDE_FACE"|"MEMBER_PROJECTIONS_UNRESOLVED_OR_CONFLICTING"|"NUMERIC_AREA_UNVERIFIED";
type Areas={plateProjectedSqIn:number;memberCoveredProjectedSqIn:number;uncoveredProjectedSqIn:number};
function result(hold:Hold|null,areas:Areas|null=null,unresolvedMemberIds:string[]=[]){
 return {status:hold?"HELD_UNVERIFIED" as const:"PROJECTED_GAP_AREA_REVIEW_ONLY" as const,
  hold,areas,unresolvedMemberIds,usableWoodAreaVerified:false,toothCoverageVerified:false,
  approvedGapVerified:false,platePlacementAccepted:false,capacityVerified:false,
  engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false};
}

/** Known geometric uncovered area, not an installation gap or an allowance.
 * Never aggregate if evidence is incomplete, overlaps, or leaves its exact
 * source face. A zero uncovered area is not acceptance of physical placement. */
export function reviewPlateProjectedGaps(face:ExplicitJointFace|null,plate:ExplicitPlateOutline|null,
 expectedMemberIds:readonly string[],projections:readonly ExplicitMemberProjection[]){
 const footprint=reviewPlateFootprint(face,plate);
 if(footprint.hold||!plate)return result("FACE_OR_PLATE_UNVERIFIED");
 if(footprint.geometryRelation==="protrudes")return result("PLATE_OUTSIDE_FACE");
 const conflicts=reviewPlateCoverageConflicts(face,plate,expectedMemberIds,projections);
 if(conflicts.hold)
  return result("MEMBER_PROJECTIONS_UNRESOLVED_OR_CONFLICTING",null,conflicts.unresolvedMemberIds);
 const members=reviewPlateMemberOverlap(face,plate,expectedMemberIds,projections);
 if(members.hold||members.unresolvedCount)return result("MEMBER_PROJECTIONS_UNRESOLVED_OR_CONFLICTING");
 const [origin,...rest]=plate.vertices;
 const twice=rest.slice(0,-1).reduce((sum,left,i)=>{
  const right=rest[i+1];
  return sum+(left.x-origin.x)*(right.y-origin.y)-(left.y-origin.y)*(right.x-origin.x);
 },0);
 const plateProjectedSqIn=Math.abs(twice)/2;
 const memberCoveredProjectedSqIn=members.rows.reduce((sum,row)=>sum+(row.projectedOverlapSqIn??NaN),0);
 const uncoveredProjectedSqIn=plateProjectedSqIn-memberCoveredProjectedSqIn;
 // Do not clamp a numerical mismatch into apparent complete coverage.
 if(![plateProjectedSqIn,memberCoveredProjectedSqIn,uncoveredProjectedSqIn].every(Number.isFinite)||
    plateProjectedSqIn<=0||memberCoveredProjectedSqIn<0||uncoveredProjectedSqIn<0)
  return result("NUMERIC_AREA_UNVERIFIED");
 return result(null,{plateProjectedSqIn,memberCoveredProjectedSqIn,uncoveredProjectedSqIn});
}
