/** A fail-closed release gate for downstream manufacturing integrations.
 * No current Woodtruss analysis is qualified for fabrication.
 */
export type DesignStatus = "GEOMETRY_ONLY_NOT_ENGINEERED" | "PRELIMINARY_NOT_ENGINEERED" | "ENGINEERING_VERIFIED";
export interface EngineeringEvidence {
  independentReviewApproved: boolean;
  structuralChecksPassed: boolean;
  lumberChecksPassed: boolean;
  connectorChecksPassed: boolean;
  loadCombinationsPassed: boolean;
  manufacturingChecksPassed: boolean;
  approvedRevisionId: string;
}
export interface DesignReleaseRequest {
  designId: string;
  revisionId: string;
  status: DesignStatus;
  evidence?: EngineeringEvidence;
}
export interface DesignReleaseDecision { allowed: boolean; reasons: string[]; }
export function evaluateFabricationRelease(request:DesignReleaseRequest):DesignReleaseDecision {
  const reasons:string[]=[];
  if(!request.designId.trim() || !request.revisionId.trim()) reasons.push("Missing design or revision identifier");
  if(request.status!=="ENGINEERING_VERIFIED") reasons.push("Design is not engineering-verified");
  const e=request.evidence;
  if(!e) reasons.push("Missing independent engineering evidence");
  else {
    if(!e.independentReviewApproved) reasons.push("Independent engineering review not approved");
    if(!e.structuralChecksPassed) reasons.push("Structural checks incomplete");
    if(!e.lumberChecksPassed) reasons.push("Lumber checks incomplete");
    if(!e.connectorChecksPassed) reasons.push("Connector plate checks incomplete");
    if(!e.loadCombinationsPassed) reasons.push("Load combination checks incomplete");
    if(!e.manufacturingChecksPassed) reasons.push("Manufacturing checks incomplete");
    if(!e.approvedRevisionId || e.approvedRevisionId!==request.revisionId) reasons.push("Approval revision mismatch");
  }
  // A caller-provided boolean is not an authenticated engineering approval.
  // Until signed, independently validated approval records are supported, fail closed.
  reasons.push("No trusted engineering approval issuer is configured");
  return {allowed:false,reasons};
}
/** Current engine has no verified engineering approval issuer; do not generate
 * ENGINEERING_VERIFIED records from preliminary calculations. */
