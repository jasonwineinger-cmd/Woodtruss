import { reviewDocumentedPlateJoint, type ExpectedPlateJointReview, type SuppliedPlateJointReview } from "./plate-joined-review.js";
import { verifyLocalPlateSourceArtifact, type AuthorizedPlateSourceArtifact } from "./plate-source-artifact.js";

type Hold="REFERENCE_OR_BOUND_JOINT_UNVERIFIED"|"AUTHORIZED_LOCAL_ARTIFACT_UNVERIFIED";
function result(hold:Hold|null,{scenarioCount,incidentMemberCount}={scenarioCount:0,incidentMemberCount:0}){
 return {
  status:hold===null?"SOURCE_LINKED_APPLICABILITY_REVIEW_ONLY" as const:"HELD_UNVERIFIED" as const,
  hold,localArtifactMatched:hold===null,documentedJointCasesMatched:hold===null,
  scenarioCount,incidentMemberCount,
  manufacturerSourceAuthenticated:false,manufacturerScopeApproved:false,applicabilityVerified:false,
  capacityVerified:false,engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false,
 };
}

/** Use the same supplied reference record for both byte identity and joint-case
 * comparison. This does not parse the artifact or decide whether its scope
 * applies. The returned assessment intentionally excludes bytes and raw keys. */
export async function reviewSourceLinkedPlateJoint(
 expected:ExpectedPlateJointReview,
 authorization:AuthorizedPlateSourceArtifact|null,
 supplied:SuppliedPlateJointReview & {localArtifactBytes?:Uint8Array},
){
 const reference=supplied.reference;
 if(!reference)return result("REFERENCE_OR_BOUND_JOINT_UNVERIFIED");
 const joint=reviewDocumentedPlateJoint(expected,{reference,forces:supplied.forces});
 if(joint.status!=="DOCUMENTED_REVIEW_ONLY")return result("REFERENCE_OR_BOUND_JOINT_UNVERIFIED");
 const artifact=await verifyLocalPlateSourceArtifact(expected.reference,authorization,
  {reference:reference.metadata,bytes:supplied.localArtifactBytes});
 if(artifact.status!=="EXACT_ARTIFACT_REVIEW_ONLY")return result("AUTHORIZED_LOCAL_ARTIFACT_UNVERIFIED");
 return result(null,joint);
}
