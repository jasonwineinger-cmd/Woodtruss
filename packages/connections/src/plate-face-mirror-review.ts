import {reviewPlateFootprint,type ExplicitJointFace,type ExplicitPlateOutline} from "./plate-footprint-review.js";
type FaceInput={face:ExplicitJointFace;outline:ExplicitPlateOutline};
type Point={x:number;y:number};
type ExpectedFacePair={
 revision:string;jointId:string;frontFaceId:string;backFaceId:string;frontFrameId:string;backFrameId:string;units:"in";
};
type ExplicitMirror={
 /** Caller-supplied back coordinates: negate exactly one front coordinate, then add translations. */
 reflectedAxis:"x"|"y";translateXIn:number;translateYIn:number;
};
type Hold="FACE_PAIR_UNVERIFIED"|"OUTLINE_UNVERIFIED"|"EXPLICIT_MIRROR_UNVERIFIED";
function result(hold:Hold|null,frontRelation:string|null=null,backRelation:string|null=null,
 projectedFaceBoundariesCoincide:boolean|null=null,projectedOutlinesCoincide:boolean|null=null){
 return {status:hold?"HELD_UNVERIFIED" as const:"INDEPENDENT_FACE_GEOMETRY_REVIEW_ONLY" as const,
  hold,frontRelation,backRelation,projectedFaceBoundariesCoincide,projectedOutlinesCoincide,
  physicalFaceRegistrationVerified:false,pairedPlacementAccepted:false,capacityVerified:false,
  engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false};
}
const id=(x:unknown)=>typeof x==="string"&&x.trim().length>0&&x===x.trim();
const same=(a:Point,b:Point)=>a.x===b.x&&a.y===b.y;
function sameRing(a:readonly Point[],b:readonly Point[]){
 return a.length===b.length&&b.some((point,start)=>same(a[0],point)&&
  [1,-1].some(direction=>a.every((value,i)=>same(value,b[(start+direction*i+b.length)%b.length]))));
}

/** Evaluate each face independently, then compare projected outlines in an
 * explicitly supplied mirrored frame. No inferred handedness, physical alignment,
 * combined usable area, acceptance, or recommendation. */
export function reviewPlateFaceMirror(expected:ExpectedFacePair,front:FaceInput|null,
 back:FaceInput|null,mirror:ExplicitMirror|null){
 if(!front?.face||!back?.face||expected.units!=="in"||
    ![expected.revision,expected.jointId,expected.frontFaceId,expected.backFaceId,expected.frontFrameId,expected.backFrameId].every(id)||
    expected.frontFaceId===expected.backFaceId||expected.frontFrameId===expected.backFrameId||
    [front.face,back.face].some(face=>face.revision!==expected.revision||face.jointId!==expected.jointId||face.units!==expected.units)||
    front.face.faceId!==expected.frontFaceId||back.face.faceId!==expected.backFaceId||
    front.face.frameId!==expected.frontFrameId||back.face.frameId!==expected.backFrameId)
  return result("FACE_PAIR_UNVERIFIED");
 const a=reviewPlateFootprint(front.face,front.outline),b=reviewPlateFootprint(back.face,back.outline);
 if(a.hold||b.hold)return result("OUTLINE_UNVERIFIED");
 if(!mirror||!["x","y"].includes(mirror.reflectedAxis)||
    !Number.isFinite(mirror.translateXIn)||!Number.isFinite(mirror.translateYIn))
  return result("EXPLICIT_MIRROR_UNVERIFIED",a.geometryRelation,b.geometryRelation);
 const map=(p:Point)=>({
  x:(mirror.reflectedAxis==="x"?-p.x:p.x)+mirror.translateXIn,
  y:(mirror.reflectedAxis==="y"?-p.y:p.y)+mirror.translateYIn,
 });
 const projected=front.outline.vertices.map(map);
 const ends=[map({x:front.face.minX,y:front.face.minY}),map({x:front.face.maxX,y:front.face.maxY})];
 if([...projected,...ends].some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))
  return result("EXPLICIT_MIRROR_UNVERIFIED",a.geometryRelation,b.geometryRelation);
 const bounds=back.face;
 const sameBounds=Math.min(...ends.map(p=>p.x))===bounds.minX&&Math.max(...ends.map(p=>p.x))===bounds.maxX&&
  Math.min(...ends.map(p=>p.y))===bounds.minY&&Math.max(...ends.map(p=>p.y))===bounds.maxY;
 return result(null,a.geometryRelation,b.geometryRelation,sameBounds,sameRing(projected,back.outline.vertices));
}
