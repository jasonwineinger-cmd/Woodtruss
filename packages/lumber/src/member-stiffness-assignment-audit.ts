import type { TrussModel } from "../../analysis/src/index.js";
import { assertAuditedTrussModel } from "../../analysis/src/model-audit.js";
import { validateLumberCatalog, type LumberCatalog } from "./catalog.js";

export interface MemberCatalogStiffnessAssignment {
  modelRevisionId:string;
  memberId:string;
  /** Ordered source incidence, not an unordered catalog or member label match. */
  fromNodeId:string;
  toNodeId:string;
  catalogId:string;
  referenceValueId:string;
  modulusBasis:"catalog-mean" | "catalog-minimum";
  assignmentRecordId:string;
}
const text=(v:unknown)=>typeof v==="string"&&v.trim().length>0;

/** Reconcile all numerical solver stiffness inputs with caller-supplied
 * heterogeneous member assignments. Does not modify the solver or certify any
 * data source, grade selection, factor, section adequacy or built member. */
export function auditPreliminaryMemberStiffnessAssignments(
  model:TrussModel, modelRevisionId:string, catalog:LumberCatalog,
  assignments:readonly MemberCatalogStiffnessAssignment[],
) {
  if (!text(modelRevisionId)) throw new Error("An explicit model revision is required");
  assertAuditedTrussModel(model);
  validateLumberCatalog(catalog);
  const members=new Map(model.bars.map(bar=>[bar.id,bar]));
  const records=new Map(catalog.records.map(row=>[row.referenceValueId,row]));
  const byMember=new Map<string,MemberCatalogStiffnessAssignment>();
  const receiptIds=new Set<string>();
  for(const assignment of assignments) {
    if (!assignment || !members.has(assignment.memberId) || byMember.has(assignment.memberId) ||
      !text(assignment.assignmentRecordId) || receiptIds.has(assignment.assignmentRecordId))
      throw new Error("Unknown, duplicate or untraceable member stiffness assignment");
    receiptIds.add(assignment.assignmentRecordId);
    byMember.set(assignment.memberId,assignment);
  }
  const rows=[...members.values()].map(bar=>{
    const assignment=byMember.get(bar.id);
    const holds:string[]=[];
    const selected=assignment ? records.get(assignment.referenceValueId) : undefined;
    if (!assignment) holds.push("Missing assignment for this member");
    else {
      if (assignment.modelRevisionId!==modelRevisionId || assignment.catalogId!==catalog.catalogId ||
        assignment.fromNodeId!==bar.a || assignment.toNodeId!==bar.b)
        holds.push("Assignment model revision, catalog or ordered member incidence is stale");
      if (!selected) holds.push("Assigned catalog row is unavailable");
      if (assignment.modulusBasis!=="catalog-mean" && assignment.modulusBasis!=="catalog-minimum")
        holds.push("Assigned catalog modulus basis is not explicit");
      if (selected) {
        const expectedArea=selected.actualWidthIn*selected.actualDepthIn;
        if (!Number.isFinite(expectedArea) || expectedArea!==bar.areaIn2)
          holds.push("Model area differs from the assigned actual rectangular section");
        const expectedModulus=assignment.modulusBasis==="catalog-mean" ? selected.ePsi :
          assignment.modulusBasis==="catalog-minimum" ? selected.eMinPsi : undefined;
        if (expectedModulus!==undefined && expectedModulus!==bar.elasticModulusPsi)
          holds.push("Model elastic modulus differs from the explicitly selected catalog field");
      }
    }
    return {memberId:bar.id,fromNodeId:bar.a,toNodeId:bar.b,
      assignmentRecordId:assignment?.assignmentRecordId ?? null,
      referenceValueId:selected?.referenceValueId ?? null,
      modulusBasis:assignment?.modulusBasis==="catalog-mean" || assignment?.modulusBasis==="catalog-minimum"
        ? assignment.modulusBasis : null,
      comparisonStatus:holds.length ? "HOLD_ASSIGNMENT_MISMATCH" as const : "MATCHES_DECLARED_INPUTS" as const,holds};
  });
  const matchedCount=rows.filter(row=>!row.holds.length).length;
  return {status:"PRELIMINARY_NOT_ENGINEERED" as const,modelRevisionId,catalogId:catalog.catalogId,rows,
    matchedCount,heldCount:rows.length-matchedCount,numericalInputsReconciled:matchedCount === rows.length && rows.length > 0,
    sourceIndependentlyVerified:false as const,approvedForStructuralUse:false as const,
    warnings:["Comparison only. An exact numerical match does not authenticate the catalog or establish material suitability.",
      "No licensed numbers are reproduced by this report; no standard, design factors or size selection are applied."]};
}
