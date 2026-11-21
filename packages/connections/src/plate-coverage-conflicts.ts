import {reviewPlateMemberOverlap,type ExplicitMemberProjection} from "./plate-member-overlap-review.js";
import type {ExplicitJointFace,ExplicitPlateOutline} from "./plate-footprint-review.js";
type Point={x:number;y:number};
const cross=(a:Point,b:Point,p:Point)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
function intersect(subject:readonly Point[],clip:readonly Point[]):Point[]|null {
 const winding=Math.sign(cross(clip[0],clip[1],clip[2]));
 let pass=[...subject];
 for(const [i,a] of clip.entries()){
  if(!pass.length)break;
  const b=clip[(i+1)%clip.length],next:Point[]=[];
  let prev=pass[pass.length-1],before=winding*cross(a,b,prev);
  for(const cur of pass){
   const after=winding*cross(a,b,cur);
   if(!Number.isFinite(before)||!Number.isFinite(after))return null;
   if((before<0)!==(after<0)){
    const delta=before-after;
    if(!Number.isFinite(delta))return null;
    const t=before/delta;
    const point={x:prev.x+(cur.x-prev.x)*t,y:prev.y+(cur.y-prev.y)*t};
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return null;
    next.push(point);
   }
   if(after>=0)next.push(cur);
   prev=cur;before=after;
  }
  pass=next;
 }
 return pass;
}
type Conflict={memberIds:[string,string];sharedProjectedSqIn:number};
type Hold="INPUT_SCOPE_UNVERIFIED"|"MEMBER_COVERAGE_UNRESOLVED"|"OVERLAPPING_MEMBER_COVERAGE"|"NUMERIC_GEOMETRY_UNVERIFIED";
function result(hold:Hold|null,conflicts:Conflict[]=[],unresolvedMemberIds:string[]=[]){
 return {status:hold?"HELD_UNVERIFIED" as const:"NO_PROJECTED_CONFLICT_FOUND_REVIEW_ONLY" as const,
  hold,conflicts,unresolvedMemberIds,additiveAreaVerified:false,memberOwnershipApproved:false,
  toothCoverageVerified:false,platePlacementAccepted:false,capacityVerified:false,engineeringApproved:false,
  fabricationAuthorized:false,machineReleaseAuthorized:false};
}

/** Detect pairwise member overlaps only where both projected polygons cover
 * the given plate outline. Each warning is independent: a triple overlap can
 * appear in three warnings, so pairwise areas are deliberately not summed.
 * Zero-area contact is not an overlap; no inference about physical ownership. */
export function reviewPlateCoverageConflicts(face:ExplicitJointFace|null,plate:ExplicitPlateOutline|null,
 members:readonly string[],projections:readonly ExplicitMemberProjection[]){
 // Bound the explicit all-pairs review to a single small joint.
 if(!Array.isArray(members)||members.length>32||!Array.isArray(projections)||projections.length>32)
  return result("INPUT_SCOPE_UNVERIFIED");
 const source=reviewPlateMemberOverlap(face,plate,members,projections);
 if(source.hold||!plate)return result("INPUT_SCOPE_UNVERIFIED");
 const byId=new Map(projections.map(p=>[p.memberId,p]));
 const known=source.rows.filter(row=>row.state==="GEOMETRY_ONLY"&&row.projectedOverlapSqIn>0);
 const unresolved=source.rows.flatMap(row=>row.state==="GEOMETRY_ONLY"?[]:[row.memberId]);
 const conflicts:Conflict[]=[];
 for(const [i,left] of known.entries()){
  const first=intersect(plate.vertices,byId.get(left.memberId)!.vertices);
  if(first===null)return result("NUMERIC_GEOMETRY_UNVERIFIED");
  for(const right of known.slice(i+1)){
   const shared=intersect(first,byId.get(right.memberId)!.vertices);
   if(shared===null)return result("NUMERIC_GEOMETRY_UNVERIFIED");
   const twice=shared.slice(1,-1).reduce((sum,p,index)=>sum+cross(shared[0],p,shared[index+2]),0);
   if(!Number.isFinite(twice))return result("NUMERIC_GEOMETRY_UNVERIFIED");
   if(twice!==0)conflicts.push({memberIds:[left.memberId,right.memberId],sharedProjectedSqIn:Math.abs(twice)/2});
  }
 }
 return conflicts.length?result("OVERLAPPING_MEMBER_COVERAGE",conflicts,unresolved):
  unresolved.length?result("MEMBER_COVERAGE_UNRESOLVED",[],unresolved):result(null);
}
