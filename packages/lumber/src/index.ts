/** Preliminary member demand summary. NOT a wood design or NDS capacity check. */
import type {TrussModel,TrussResult} from "../../analysis/src/index.js";
export interface MemberDemand {
  memberId:string;
  lengthIn:number;
  axialForceLb:number;
  behavior:"tension"|"compression"|"zero";
  axialStressPsi:number;
  /** Euler buckling is illustrative only and does not substitute for NDS column design. */
  eulerBucklingLb:number|null;
}
export function summarizeMemberDemands(model:TrussModel,result:TrussResult):MemberDemand[] {
 const nodes=new Map(model.nodes.map(n=>[n.id,n]));
 return model.bars.map(bar=>{
  const a=nodes.get(bar.a),b=nodes.get(bar.b);
  if(!a||!b)throw new Error("Unknown member endpoint");
  const lengthIn=Math.hypot(a.x-b.x,a.y-b.y);
  const axialForceLb=result.axialForceLb[bar.id];
  if(!Number.isFinite(axialForceLb))throw new Error("Missing member force");
  return {memberId:bar.id,lengthIn,axialForceLb,
   behavior:axialForceLb>1e-8?"tension":axialForceLb< -1e-8?"compression":"zero",
   axialStressPsi:axialForceLb/bar.areaIn2,eulerBucklingLb:null};
 });
}

export { assessLumberDesignInputEvidence, type LumberInputEvidence } from "./design-readiness.js";
export { studyPreliminaryAxialStability, type AxialStabilityStudyInput } from "./axial-stability-study.js";
export { studyWithDocumentedModulus, type LumberModulusEvidence, type LumberModulusPublication } from "./modulus-provenance.js";
export { reviewPreliminaryStockFrontier, type PreliminaryStockOffer, type SchematicMemberStockNeed } from "./stock-frontier.js";
export { reviewPreliminaryStockWithCaseEvidence, type StockCaseExpectation, type StockOptionEvidence } from "./stock-evidence-frontier.js";
export { recomputePreliminaryStockDemands, reviewStockWithRecomputedDemand,
  type StockDemandCaseInput, type StockDemandOptionEvidence } from "./stock-demand-evidence.js";
export { reviewLumberReferenceQuantityIntake, type LumberPublicationIntake, type LumberQuantityExpectation,
  type LumberQuantityReceipt } from "./reference-quantity-intake.js";
export { reviewLumberIntakeWithPrivatePublicationBytes,
  type PrivateLumberPublicationArtifact } from "./publication-byte-evidence.js";
