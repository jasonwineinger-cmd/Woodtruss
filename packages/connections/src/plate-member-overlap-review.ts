import { reviewPlateFootprint,type ExplicitJointFace,type ExplicitPlateOutline } from "./plate-footprint-review.js";

type Point={x:number;y:number};
export type ExplicitMemberProjection=ExplicitPlateOutline & {memberId:string};
type Hold="PLATE_OR_FACE_UNVERIFIED"|"MEMBER_SCOPE_UNVERIFIED";
type Resolved={memberId:string;projectedOverlapSqIn:number;state:"GEOMETRY_ONLY"};
type Unresolved={memberId:string;projectedOverlapSqIn:null;state:"MISSING_PROJECTION"|"UNVERIFIED_PROJECTION"};

const cross=(a:Point,b:Point,p:Point)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
function clippedArea(subject:readonly Point[],bounds:readonly Point[]){
 const winding=Math.sign(cross(bounds[0],bounds[1],bounds[2]));
 let points=[...subject];
 for(const [i,a] of bounds.entries()){
  if(!points.length)return 0;
  const b=bounds[(i+1)%bounds.length];
  const next:Point[]=[];
  let previous=points[points.length-1],before=winding*cross(a,b,previous);
  for(const point of points){
   const after=winding*cross(a,b,point);
   if(!Number.isFinite(before)||!Number.isFinite(after))return null;
   if((before>=0)!==(after>=0)){
    const denominator=before-after;
    if(!Number.isFinite(denominator))return null;
    const t=before/denominator;
    const intersection={x:previous.x+(point.x-previous.x)*t,y:previous.y+(point.y-previous.y)*t};
    if(!Number.isFinite(intersection.x)||!Number.isFinite(intersection.y))return null;
    next.push(intersection);
   }
   if(after>=0)next.push(point);
   previous=point;before=after;
  }
  points=next;
 }
 if(points.length<3)return 0;
 const twice=points.slice(1,-1).reduce((sum,p,i)=>sum+cross(points[0],p,points[i+2]),0);
 return Number.isFinite(twice)?Math.abs(twice)/2:null;
}
function output(hold:Hold|null,rows:(Resolved|Unresolved)[]=[]){
 return {status:hold?"HELD_UNVERIFIED" as const:"MEMBER_PROJECTION_REVIEW_ONLY" as const,
  hold,rows,unresolvedCount:rows.filter(row=>row.state!=="GEOMETRY_ONLY").length,
  toothCoverageVerified:false,aggregateUsableAreaVerified:false,platePlacementAccepted:false,
  capacityVerified:false,engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false};
}

/** Compare distinct independently supplied member projections in the same
 * exact joint face frame. Overlapping member areas are not added together.
 * Missing/invalid member evidence is unresolved, never assumed to be zero. */
export function reviewPlateMemberOverlap(face:ExplicitJointFace|null,plate:ExplicitPlateOutline|null,
 expectedMemberIds:readonly string[],projections:readonly ExplicitMemberProjection[]){
 if(!face||!plate||reviewPlateFootprint(face,plate).hold)return output("PLATE_OR_FACE_UNVERIFIED");
 if(!Array.isArray(expectedMemberIds)||!Array.isArray(projections))return output("MEMBER_SCOPE_UNVERIFIED");
 const expected=new Set(expectedMemberIds);
 if(!expected.size||expected.size!==expectedMemberIds.length||
    expectedMemberIds.some(id=>typeof id!=="string"||!id.trim()||id!==id.trim()))
  return output("MEMBER_SCOPE_UNVERIFIED");
 const distinct=new Map<string,ExplicitMemberProjection>();
 for(const projection of projections){
  if(!projection||!expected.has(projection.memberId)||distinct.has(projection.memberId))
   return output("MEMBER_SCOPE_UNVERIFIED");
  distinct.set(projection.memberId,projection);
 }
 return output(null,expectedMemberIds.map(memberId=>{
  const projection=distinct.get(memberId);
  if(!projection)return {memberId,state:"MISSING_PROJECTION",projectedOverlapSqIn:null};
  const reviewed=reviewPlateFootprint(face,projection);
  const area=reviewed.hold||reviewed.geometryRelation==="protrudes"?null:
   clippedArea(plate.vertices,projection.vertices);
  return area===null?{memberId,state:"UNVERIFIED_PROJECTION",projectedOverlapSqIn:null}:
   {memberId,state:"GEOMETRY_ONLY",projectedOverlapSqIn:area};
 }));
}
