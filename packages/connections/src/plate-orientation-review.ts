import { reviewDocumentedPlateJoint, type ExpectedPlateJointReview, type SuppliedPlateJointReview } from "./plate-joined-review.js";

export interface PlateOrientationBasis {
 revision:string;
 jointId:string;
 axisDatum:"plate-long-axis"|"plate-short-axis";
 /** Explicit vector in the model's global X/Y coordinates, not a placement. */
 axisVector:{x:number;y:number};
 incidentMemberIds:readonly string[];
}
type Expected=ExpectedPlateJointReview & {orientation:PlateOrientationBasis};
type Supplied=SuppliedPlateJointReview & {orientation?:PlateOrientationBasis};
type Hold="MISSING_ORIENTATION"|"ORIENTATION_MISMATCH"|"JOINT_EVIDENCE_UNVERIFIED"|"MEMBER_GEOMETRY_UNVERIFIED";
function output(hold:Hold|null,rows:{memberId:string;unsignedAxisAngleDeg:number}[]=[]){
 return {status:hold?"HELD_UNVERIFIED" as const:"ORIENTATION_GEOMETRY_REVIEW_ONLY" as const,hold,rows,
  angleMeaning:"unsigned smaller angle between modeled member axis and supplied plate axis (degrees)" as const,
  placementRecommended:false,capacityVerified:false,engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false};
}
function vector(x:number,y:number){
 const length=Math.hypot(x,y);
 return Number.isFinite(length)&&length>0?{x:x/length,y:y/length}:null;
}
function exactIds(expected:readonly string[],actual:readonly string[]){
 return Array.isArray(expected)&&Array.isArray(actual)&&expected.length>0&&expected.length===actual.length&&
  new Set(expected).size===expected.length&&new Set(actual).size===actual.length&&
  expected.every(id=>typeof id==="string"&&id.trim()&&actual.includes(id));
}

/** Geometric use review only. No angle bin, grain orientation, force direction,
 * plate placement, reference applicability, or capacity is inferred. */
export function reviewPlateOrientation(expected:Expected,supplied:Supplied) {
 const request=expected.orientation, evidence=supplied.orientation;
 if(!request?.axisVector||!evidence?.axisVector)return output("MISSING_ORIENTATION");
 const {x,y}=request.axisVector;
 const plateAxis=vector(x,y);
 if(!plateAxis||(request.axisDatum!=="plate-long-axis"&&request.axisDatum!=="plate-short-axis")||
    request.axisDatum!==expected.reference.basis.angleDatum||evidence.axisDatum!==request.axisDatum||
    request.revision!==expected.source.revision||evidence.revision!==request.revision||
    request.jointId!==expected.jointId||evidence.jointId!==request.jointId||
    evidence.axisVector.x!==x||evidence.axisVector.y!==y||
    !exactIds(request.incidentMemberIds,evidence.incidentMemberIds))
  return output("ORIENTATION_MISMATCH");
 if(reviewDocumentedPlateJoint(expected,supplied).status!=="DOCUMENTED_REVIEW_ONLY")
  return output("JOINT_EVIDENCE_UNVERIFIED");
 const {nodes,bars}=expected.source.model;
 const at=nodes.find(node=>node.id===request.jointId);
 const incident=bars.filter(bar=>bar.a===request.jointId||bar.b===request.jointId);
 if(!at||!exactIds(incident.map(bar=>bar.id),request.incidentMemberIds))
  return output("MEMBER_GEOMETRY_UNVERIFIED");
 const rows=[];
 for(const bar of incident){
  const other=nodes.find(node=>node.id===(bar.a===at.id?bar.b:bar.a));
  const along=other&&vector(other.x-at.x,other.y-at.y);
  if(!along)return output("MEMBER_GEOMETRY_UNVERIFIED");
  const dot=plateAxis.x*along.x+plateAxis.y*along.y;
  const cross=plateAxis.x*along.y-plateAxis.y*along.x;
  rows.push({memberId:bar.id,unsignedAxisAngleDeg:Math.atan2(Math.abs(cross),Math.abs(dot))*180/Math.PI});
 }
 return output(null,rows);
}
