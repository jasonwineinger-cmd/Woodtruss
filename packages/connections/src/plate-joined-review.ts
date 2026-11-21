import { inventoryBoundConnectorPlateDemands, type PlateForceEvidence } from "./plate-model-binding.js";
import { comparePlateReferenceEvidence, type PlateReferenceEvidence } from "./plate-reference-evidence.js";

type ModelSource=Parameters<typeof inventoryBoundConnectorPlateDemands>[0];
type Cases=Parameters<typeof inventoryBoundConnectorPlateDemands>[1];
type ReferenceTarget={
 revision:string;
 jointId:string;
 modelKey:string;
 scenarios:readonly {id:string;loadKey:string}[];
};
export interface ExpectedPlateJointReview {
 source:ModelSource;
 cases:Cases;
 jointId:string;
 reference:PlateReferenceEvidence;
}
export interface SuppliedPlateJointReview {
 reference?:{target:ReferenceTarget; metadata:PlateReferenceEvidence};
 forces?:PlateForceEvidence[];
}
type Hold="MISSING_EVIDENCE"|"REFERENCE_TARGET_MISMATCH"|"INVALID_REFERENCE_METADATA"|
 "REFERENCE_METADATA_MISMATCH"|"BOUND_FORCE_EVIDENCE_UNVERIFIED"|"JOINT_NOT_IN_BOUND_MODEL";

function result(hold:Hold|null,scenarioCount=0,incidentMemberCount=0) {
 return {
  status:hold===null?"DOCUMENTED_REVIEW_ONLY" as const:"HELD_UNVERIFIED" as const,
  hold,scenarioCount,incidentMemberCount,
  manufacturerSourceAuthenticated:false,capacityVerified:false,engineeringApproved:false,
  fabricationAuthorized:false,machineReleaseAuthorized:false,
 };
}

/** Join metadata and numerical evidence for one explicitly expected joint.
 * Matched metadata is not authenticated or approved. Export only aggregate
 * checks and counts; do not echo source URLs, digests, keys, loads, or forces.
 */
export function reviewDocumentedPlateJoint(expected:ExpectedPlateJointReview,supplied:SuppliedPlateJointReview) {
 if(!supplied.reference||!supplied.forces?.length)return result("MISSING_EVIDENCE");
 const {target,metadata}=supplied.reference;
 const ids=expected.cases.map(s=>s.id);
 if(!target||target.revision!==expected.source.revision||target.jointId!==expected.jointId||
    !Array.isArray(target.scenarios)||target.scenarios.length!==ids.length||
    new Set(target.scenarios.map(s=>s?.id)).size!==ids.length||
    !ids.every(id=>target.scenarios.some(s=>s?.id===id)))
  return result("REFERENCE_TARGET_MISMATCH");
 try{
  if(comparePlateReferenceEvidence(expected.reference,metadata).status!=="METADATA_MATCH_UNVERIFIED")
   return result("REFERENCE_METADATA_MISMATCH");
 }catch{return result("INVALID_REFERENCE_METADATA");}
 try{
  // Product identity metadata never goes into the force solver or plate recommendations.
  const rows=inventoryBoundConnectorPlateDemands(expected.source,expected.cases,[],supplied.forces);
  const matchesCaseKeys=supplied.forces.every(force=>force.modelKey===target.modelKey&&
   target.scenarios.some(s=>s.id===force.scenarioId&&s.loadKey===force.loadKey));
  if(!matchesCaseKeys)return result("REFERENCE_TARGET_MISMATCH");
  const joint=rows.find(row=>row.jointId===expected.jointId);
  if(!joint?.incidentMemberIds.length)return result("JOINT_NOT_IN_BOUND_MODEL");
  return result(null,joint.scenarios.length,joint.incidentMemberIds.length);
 }catch{return result("BOUND_FORCE_EVIDENCE_UNVERIFIED");}
}
