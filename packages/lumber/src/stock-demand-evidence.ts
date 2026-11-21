import type { TrussModel } from "../../analysis/src/index.js";
import type { ExplicitLoadCase } from "../../analysis/src/cases.js";
import { analyzeExplicitScenarios } from "../../analysis/src/scenarios.js";
import type { LumberCatalog } from "./catalog.js";
import type { PreliminaryStockOffer, SchematicMemberStockNeed } from "./stock-frontier.js";
import { reviewPreliminaryStockWithCaseEvidence, type StockCaseExpectation, type StockOptionEvidence } from "./stock-evidence-frontier.js";

export type StockDemandCaseInput = { basisId: string; definition: ExplicitLoadCase };
export type RecomputedStockDemand = { modelRevisionId: string; contextKey: string; axialForceLb: number };
export type StockDemandOptionEvidence = Omit<StockOptionEvidence, "caseReviews"> & {
  caseReviews: readonly (StockOptionEvidence["caseReviews"][number] & { demand: RecomputedStockDemand })[];
};
const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
// Canonical snapshot for exact replay, not a signature. Preserve solver array order.
const caseSnapshot = (id: string, basisId: string, model: TrussModel) => JSON.stringify([
  "explicit-pin-joint-case-v1", id, basisId,
  model.nodes.map(({id,x,y})=>[id,x,y]),
  model.bars.map(({id,a,b,areaIn2,elasticModulusPsi})=>[id,a,b,areaIn2,elasticModulusPsi]),
  model.supports.map(({nodeId,fixX,fixY})=>[nodeId,fixX,fixY]),
  model.loads.map(({nodeId,fxLb,fyLb})=>[nodeId,fxLb ?? 0,fyLb ?? 0]),
]);

/** Recomputes each explicitly supplied case independently. Invalid or unsolved
 * definitions never yield a member force. No capacity or standard is implied. */
export function recomputePreliminaryStockDemands(
  modelRevisionId: string, base: TrussModel, cases: readonly StockDemandCaseInput[],
) {
  if (!text(modelRevisionId)) throw new Error("Explicit model revision is required");
  const solved = new Map<string,{ basisId:string; contextKey:string; axialForceLb:Map<string,number> }>();
  const unsolved = new Set<string>();
  const seen = new Set<string>();
  for (const entry of cases) {
    const id = entry?.definition?.id;
    if (!text(id) || !text(entry.basisId) || seen.has(id)) throw new Error("Invalid or duplicate demand case identity");
    seen.add(id);
    try {
      // The scenario path requires both global and per-joint equilibrium.
      // Isolate each definition so an unsolved case cannot suppress a distinct valid case.
      const {model,result} = analyzeExplicitScenarios(base,[entry.definition]).cases[0];
      const axialForceLb = new Map(model.bars.map(({id})=>[id,result.axialForceLb[id]]));
      if (![...axialForceLb.values()].every(Number.isFinite) || !Number.isFinite(result.residualForceLb)) throw new Error("Invalid numeric case result");
      solved.set(id,{basisId:entry.basisId,contextKey:caseSnapshot(id,entry.basisId,model),axialForceLb});
    } catch {
      unsolved.add(id);
    }
  }
  return {modelRevisionId,solved,unsolved,preliminaryOnly:true as const};
}

/** Demand-binding gate around the existing schematic stock evidence adapter. */
export function reviewStockWithRecomputedDemand(
  catalog: LumberCatalog, offers: readonly PreliminaryStockOffer[], needs: readonly SchematicMemberStockNeed[],
  expectations: readonly StockCaseExpectation[], evidence: readonly StockDemandOptionEvidence[],
  modelRevisionId: string, model: TrussModel, cases: readonly StockDemandCaseInput[],
) {
  const context = recomputePreliminaryStockDemands(modelRevisionId,model,cases);
  const requiredByMember = new Map(expectations.map(entry=>[entry.memberId,entry.requiredCases]));
  const holds = new Map<string,string[]>();
  const annotated = evidence.map(receipt => ({...receipt,
    caseReviews: (Array.isArray(receipt?.caseReviews) ? receipt.caseReviews : []).map(review => {
      if (!review) return review;
      const solved = context.solved.get(review.caseId);
      const demand = solved?.axialForceLb.get(receipt.memberId);
      const stale = !!solved && demand !== undefined && (
        review.demand?.modelRevisionId !== modelRevisionId ||
        review.demand?.contextKey !== solved.contextKey || review.demand?.axialForceLb !== demand ||
        review.basisId !== solved.basisId);
      if (stale) {
        const key = JSON.stringify([receipt.memberId,receipt.offerId]);
        holds.set(key,[...(holds.get(key) ?? []),"Stale recomputed axial-demand receipt: " + review.caseId]);
      }
      return !solved || demand === undefined || stale ?
        {...review,disposition:"held" as const} : review;
    }),
  }));
  const report = reviewPreliminaryStockWithCaseEvidence(catalog,offers,needs,expectations,annotated);
  return {...report, modelRevisionId, members:report.members.map(member=>({...member,
    candidates:member.candidates.map(candidate=>({...candidate,analysisHolds:[
      ...(requiredByMember.get(member.memberId) ?? []).flatMap(({caseId,basisId})=>{
        const solved=context.solved.get(caseId);
        return !solved || solved.basisId !== basisId || !solved.axialForceLb.has(member.memberId)
          ? ["No matching recomputed member demand for named case: " + caseId] : [];
      }),
      ...(holds.get(JSON.stringify([member.memberId,candidate.offerId])) ?? []),
    ]})),
  })), warnings:[...report.warnings,
    "Named cases were recomputed as ideal planar axial demand only. No capacity, grade selection or load combination compliance was assessed."] };
}
