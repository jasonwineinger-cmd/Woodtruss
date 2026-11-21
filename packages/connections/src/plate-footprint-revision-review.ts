import {reviewPlateFootprint,type ExplicitJointFace,type ExplicitPlateOutline} from "./plate-footprint-review.js";
import {reviewPlateProjectedGaps} from "./plate-projected-gaps.js";
import type {ExplicitMemberProjection} from "./plate-member-overlap-review.js";

export interface PlateFootprintRevision {
 face:ExplicitJointFace;
 outline:ExplicitPlateOutline;
 expectedMemberIds:readonly string[];
 memberProjections:readonly ExplicitMemberProjection[];
}
type ExpectedPair={earlierRevision:string;laterRevision:string;jointId:string;faceId:string;frameId:string;units:"in"};
type Hold="REVISION_OR_COORDINATE_BASIS_MISMATCH"|"FOOTPRINT_GEOMETRY_UNVERIFIED"|"NUMERIC_DIFFERENCE_UNVERIFIED";
type CoverageHold="MEMBER_SCOPE_CHANGED"|"EARLIER_COVERAGE_UNRESOLVED"|"LATER_COVERAGE_UNRESOLVED";
type Margins={leftIn:number;rightIn:number;bottomIn:number;topIn:number};
type Areas={plateProjectedSqIn:number;memberCoveredProjectedSqIn:number;uncoveredProjectedSqIn:number};
function result(hold:Hold|null,marginDeltaIn:Margins|null=null,faceBoundaryDeltaIn:Margins|null=null,
 coverageAreaDeltaSqIn:Areas|null=null,coverageHolds:CoverageHold[]=[]){
 return {status:hold?"HELD_UNVERIFIED" as const:"FOOTPRINT_REVISION_GEOMETRY_ONLY" as const,
  hold,marginDeltaIn,faceBoundaryDeltaIn,coverageAreaDeltaSqIn,coverageHolds,
  direction:"later minus earlier in the same local coordinate frame" as const,
  usableWoodAreaVerified:false,platePlacementAccepted:false,capacityVerified:false,
  engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false};
}
const finite=(values:object)=>Object.values(values).every(Number.isFinite);
const id=(value:unknown)=>typeof value==="string"&&value.trim().length>0&&value===value.trim();
const sameScope=(a:readonly string[],b:readonly string[])=>Array.isArray(a)&&Array.isArray(b)&&a.length>0&&
 a.length===b.length&&new Set(a).size===a.length&&new Set(b).size===b.length&&a.every(member=>b.includes(member));

/** Directional differences between independently registered face projections.
 * Never aligns a new origin/face or compares coverage across changed member
 * scopes; overlap, missing evidence, or off-face coverage remain unresolved.
 */
export function reviewPlateFootprintRevision(expected:ExpectedPair,earlier:PlateFootprintRevision|null,
 later:PlateFootprintRevision|null){
 if(!earlier?.face||!later?.face||!earlier.outline||!later.outline||
    expected.units!=="in"||![expected.earlierRevision,expected.laterRevision,expected.jointId,expected.faceId,expected.frameId].every(id)||
    expected.earlierRevision===expected.laterRevision||earlier.face.revision!==expected.earlierRevision||
    later.face.revision!==expected.laterRevision||
    [earlier.face,later.face].some(face=>face.units!==expected.units||face.jointId!==expected.jointId||
      face.faceId!==expected.faceId||face.frameId!==expected.frameId))
  return result("REVISION_OR_COORDINATE_BASIS_MISMATCH");
 const a=reviewPlateFootprint(earlier.face,earlier.outline),b=reviewPlateFootprint(later.face,later.outline);
 if(!a.margins||!b.margins)return result("FOOTPRINT_GEOMETRY_UNVERIFIED");

 const diff=(x:number,y:number)=>y===x?0:y-x;
 const marginDeltaIn={
  leftIn:diff(a.margins.leftIn,b.margins.leftIn),rightIn:diff(a.margins.rightIn,b.margins.rightIn),
  bottomIn:diff(a.margins.bottomIn,b.margins.bottomIn),topIn:diff(a.margins.topIn,b.margins.topIn),
 };
 const faceBoundaryDeltaIn={
  leftIn:diff(earlier.face.minX,later.face.minX),rightIn:diff(earlier.face.maxX,later.face.maxX),
  bottomIn:diff(earlier.face.minY,later.face.minY),topIn:diff(earlier.face.maxY,later.face.maxY),
 };
 if(!finite(marginDeltaIn)||!finite(faceBoundaryDeltaIn))return result("NUMERIC_DIFFERENCE_UNVERIFIED");
 if(!sameScope(earlier.expectedMemberIds,later.expectedMemberIds))
  return result(null,marginDeltaIn,faceBoundaryDeltaIn,null,["MEMBER_SCOPE_CHANGED"]);
 const ra=reviewPlateProjectedGaps(earlier.face,earlier.outline,earlier.expectedMemberIds,earlier.memberProjections);
 const rb=reviewPlateProjectedGaps(later.face,later.outline,later.expectedMemberIds,later.memberProjections);
 if(!ra.areas||!rb.areas) {
  const holds:CoverageHold[]=[];
  if(!ra.areas)holds.push("EARLIER_COVERAGE_UNRESOLVED");
  if(!rb.areas)holds.push("LATER_COVERAGE_UNRESOLVED");
  return result(null,marginDeltaIn,faceBoundaryDeltaIn,null,holds);
 }
 const areas={
  plateProjectedSqIn:diff(ra.areas.plateProjectedSqIn,rb.areas.plateProjectedSqIn),
  memberCoveredProjectedSqIn:diff(ra.areas.memberCoveredProjectedSqIn,rb.areas.memberCoveredProjectedSqIn),
  uncoveredProjectedSqIn:diff(ra.areas.uncoveredProjectedSqIn,rb.areas.uncoveredProjectedSqIn),
 };
 return finite(areas)?result(null,marginDeltaIn,faceBoundaryDeltaIn,areas):result("NUMERIC_DIFFERENCE_UNVERIFIED");
}
