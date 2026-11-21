import { inventoryBoundConnectorPlateDemands } from "./plate-model-binding.js";
import { reviewPlateOrientation } from "./plate-orientation-review.js";

type Expected=Parameters<typeof reviewPlateOrientation>[0];
type Supplied=Parameters<typeof reviewPlateOrientation>[1];
type Hold="ORIENTATION_OR_JOINT_EVIDENCE_UNVERIFIED"|"SIGNED_CASE_JOIN_UNVERIFIED";
type MemberRow={
 memberId:string;
 unsignedAxisAngleDeg:number;
 cases:{
  scenarioId:string;
  signedAxialLb:number;
  axialSign:"positive"|"negative"|"zero-no-sign";
  modelGlobalFxLb:number;
  modelGlobalFyLb:number;
 }[];
};

function result(hold:Hold|null,rows:MemberRow[]=[]){
 return {
  status:hold===null?"SIGNED_ORIENTATION_DEMAND_REVIEW_ONLY" as const:"HELD_UNVERIFIED" as const,
  hold,rows,
  angleBasis:"unsigned smaller modeled member-to-plate axis angle in degrees" as const,
  forceBasis:"member-on-joint end force in model global axes; positive axial is solver tension" as const,
  grainOrToothDirectionVerified:false,platePlacementRecommended:false,capacityVerified:false,
  engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false,
 };
}

/** Exact, separate geometry and signed-case member-end force evidence, not a
 * force-to-grain/tooth angle, plate resultant, placement or capacity check. */
export function reviewPlateOrientationDemand(expected:Expected,supplied:Supplied){
 const orientation=reviewPlateOrientation(expected,supplied);
 if(orientation.status!=="ORIENTATION_GEOMETRY_REVIEW_ONLY"||!supplied.forces)
  return result("ORIENTATION_OR_JOINT_EVIDENCE_UNVERIFIED");
 // Isolate the exact verified numerical ledger from the geometry projection.
 // Both source calls use the independently expected model and named loads.
 let joint;
 try{
  joint=inventoryBoundConnectorPlateDemands(expected.source,expected.cases,[],
   supplied.forces).find(row=>row.jointId===expected.jointId);
 }catch{return result("SIGNED_CASE_JOIN_UNVERIFIED");}
 if(!joint||joint.scenarios.length!==expected.cases.length||
    joint.incidentMemberIds.length!==orientation.rows.length||
    joint.scenarios.some((scenario,index)=>scenario.scenarioId!==expected.cases[index].id||
      scenario.members.length!==orientation.rows.length||
      new Set(scenario.members.map(member=>member.memberId)).size!==orientation.rows.length))
  return result("SIGNED_CASE_JOIN_UNVERIFIED");
 const rows:MemberRow[]=[];
 const positiveZero=(n:number)=>n===0?0:n;
 for(const angle of orientation.rows){
  const cases:MemberRow["cases"]=[];
  for(const scenario of joint.scenarios){
   const record=scenario.members.find(member=>member.memberId===angle.memberId);
   if(!record)return result("SIGNED_CASE_JOIN_UNVERIFIED");
   const signedAxialLb=positiveZero(record.axialLb);
   cases.push({scenarioId:scenario.scenarioId,signedAxialLb,
    axialSign:signedAxialLb===0?"zero-no-sign":signedAxialLb>0?"positive":"negative",
    modelGlobalFxLb:positiveZero(record.memberOnJointFxLb),modelGlobalFyLb:positiveZero(record.memberOnJointFyLb)});
  }
  rows.push({...angle,cases});
 }
 return result(null,rows);
}
