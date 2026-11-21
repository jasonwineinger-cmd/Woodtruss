type Point={x:number;y:number};
type Target={revision:string;jointId:string;faceId:string;units:"in"};
export type ExplicitJointFace=Target & {
 /** Known Cartesian face boundary in the explicitly shared local frame. */
 frameId:string;
 minX:number;maxX:number;minY:number;maxY:number;
};
export type ExplicitPlateOutline=Target & {
 frameId:string;
 /** Ordered, convex projected outline; not an accepted plate placement. */
 vertices:readonly Point[];
};
type Hold="MISSING_FACE"|"MISSING_OUTLINE"|"FACE_TARGET_MISMATCH"|"INVALID_FACE_OR_OUTLINE";
function result(hold:Hold|null,
 margins:{leftIn:number;rightIn:number;bottomIn:number;topIn:number}|null=null){
 return {
  status:hold?"HELD_UNVERIFIED" as const:"CARTESIAN_FOOTPRINT_REVIEW_ONLY" as const,
  hold,margins,
  geometryRelation:margins?(Object.values(margins).some(v=>v<0)?"protrudes":
   Object.values(margins).some(v=>v===0)?"touches":"inside") : null,
  requiredEdgeDistanceAssessed:false,platePlacementAccepted:false,capacityVerified:false,
  engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false,
 };
}
function identifier(value:unknown):value is string {
 return typeof value==="string"&&value.trim().length>0&&value===value.trim();
}
/** True only for a strictly convex boundary in supplied order. Checking all
 * other points on the same side of every edge also rejects crossing rings. */
function convex(vertices:readonly Point[]) {
 if(!Array.isArray(vertices)||vertices.length<3||vertices.length>16||
   vertices.some(v=>!Number.isFinite(v?.x)||!Number.isFinite(v?.y)))return false;
 let winding=0;
 for(const [i,a] of vertices.entries()){
  const j=(i+1)%vertices.length,b=vertices[j];
  for(const [k,c] of vertices.entries()){
   if(k===i||k===j)continue;
   const side=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
   if(!Number.isFinite(side)||side===0||(winding&&Math.sign(side)!==winding))return false;
   winding=Math.sign(side);
  }
 }
 return true;
}

/** Signed geometric distances to four known Cartesian face bounds.
 * Negative means protruding beyond that particular bound and zero means exact
 * contact. No inference about usable wood, minimum edge distance, tooth grip,
 * backside fit, approval or fabrication. */
export function reviewPlateFootprint(face:ExplicitJointFace|null,outline:ExplicitPlateOutline|null){
 if(!face)return result("MISSING_FACE");
 if(!outline)return result("MISSING_OUTLINE");
 if(face.units!=="in"||outline.units!==face.units||
  ![face.revision,face.jointId,face.faceId,face.frameId].every(identifier)||
  outline.revision!==face.revision||outline.jointId!==face.jointId||
  outline.faceId!==face.faceId||outline.frameId!==face.frameId)
  return result("FACE_TARGET_MISMATCH");
 if(![face.minX,face.maxX,face.minY,face.maxY].every(Number.isFinite)||
    face.maxX<=face.minX||face.maxY<=face.minY||!convex(outline.vertices))
  return result("INVALID_FACE_OR_OUTLINE");
 const xs=outline.vertices.map(v=>v.x),ys=outline.vertices.map(v=>v.y);
 const zero=(n:number)=>n===0?0:n;
 const margins={
  leftIn:zero(Math.min(...xs)-face.minX),rightIn:zero(face.maxX-Math.max(...xs)),
  bottomIn:zero(Math.min(...ys)-face.minY),topIn:zero(face.maxY-Math.max(...ys)),
 };
 return Object.values(margins).every(Number.isFinite)?result(null,margins):result("INVALID_FACE_OR_OUTLINE");
}
