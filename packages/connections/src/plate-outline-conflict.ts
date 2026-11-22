import {reviewPlateFootprint,type ExplicitJointFace,type ExplicitPlateOutline} from "./plate-footprint-review.js";
type Point={x:number;y:number};
export type ExplicitCandidateOutline=ExplicitPlateOutline & {candidateId:string};
type Relation="interior-intersection"|"boundary-contact"|"disjoint";
type Hold="CANDIDATE_SCOPE_UNVERIFIED"|"FACE_OR_OUTLINE_UNVERIFIED"|"OUTLINE_OUTSIDE_FACE"|"NUMERIC_COMPARISON_UNVERIFIED";
function result(hold:Hold|null,relation:Relation|null=null){
 return {status:hold?"HELD_UNVERIFIED" as const:"OUTLINE_RELATION_GEOMETRY_ONLY" as const,
  hold,relation,clearanceRuleApplied:false,platePlacementAccepted:false,capacityVerified:false,
  engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false};
}
const labeled=(id:unknown):id is string=>typeof id==="string"&&id.trim().length>0&&id===id.trim();
function projected(vertices:readonly Point[],origin:Point,edge:Point){
 const values=vertices.map(p=>edge.x*(p.y-origin.y)-edge.y*(p.x-origin.x));
 return values.every(Number.isFinite)?{min:Math.min(...values),max:Math.max(...values)}:null;
}

/** Compare two separately supplied convex candidates on the same exact face.
 * Classifies their geometric relation via separating axes, not their member
 * coverage, acceptable separation, product suitability or physical placement. */
export function reviewPlateOutlineConflict(face:ExplicitJointFace|null,
 first:ExplicitCandidateOutline|null,second:ExplicitCandidateOutline|null){
 if(!first||!second||!labeled(first.candidateId)||!labeled(second.candidateId)||first.candidateId===second.candidateId)
  return result("CANDIDATE_SCOPE_UNVERIFIED");
 const a=reviewPlateFootprint(face,first),b=reviewPlateFootprint(face,second);
 if(a.hold||b.hold)return result("FACE_OR_OUTLINE_UNVERIFIED");
 if(a.geometryRelation==="protrudes"||b.geometryRelation==="protrudes")return result("OUTLINE_OUTSIDE_FACE");
 let separated=false,touching=false;
 for(const outline of [first,second])for(const [i,origin] of outline.vertices.entries()){
  const end=outline.vertices[(i+1)%outline.vertices.length];
  const edge={x:end.x-origin.x,y:end.y-origin.y};
  const ar=projected(first.vertices,origin,edge),br=projected(second.vertices,origin,edge);
  if(!ar||!br)return result("NUMERIC_COMPARISON_UNVERIFIED");
  separated ||= ar.max<br.min||br.max<ar.min;
  touching ||= ar.max===br.min||br.max===ar.min;
 }
 return result(null,separated?"disjoint":touching?"boundary-contact":"interior-intersection");
}
