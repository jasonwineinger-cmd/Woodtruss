import type {TrussModel} from "./index.js";
import {analyzeExplicitScenarios} from "./scenarios.js";
import type {ExplicitLoadCase} from "./cases.js";
import {previewEnvelopeLumberDemand,type MemberAxialDemand} from "../../lumber/src/envelope-demand.js";
import type {LumberCatalog} from "../../lumber/src/catalog.js";

/** One-call preliminary scenario and lumber-demand study.
 * This does not rank lumber by structural adequacy or approve member sizes.
 */
export interface PreliminaryMemberStudy {
 status:"PRELIMINARY_NOT_ENGINEERED";
 designCandidateCount:number;
 memberDemandPreviews:MemberAxialDemand[];
 maximumTensionLb:number;
 maximumCompressionLb:number;
 scenarioIds:string[];
 warnings:string[];
}
export function runPreliminaryMemberStudy(
 model:TrussModel, scenarios:ExplicitLoadCase[],catalog:LumberCatalog
):PreliminaryMemberStudy {
 const analysis=analyzeExplicitScenarios(model,scenarios);
 const memberDemandPreviews=previewEnvelopeLumberDemand(analysis.envelope,catalog);
 const values=Object.values(analysis.envelope.memberForces);
 const maximumTensionLb=Math.max(0,...values.map(v=>v.maxLb));
 const maximumCompressionLb=Math.max(0,...values.map(v=>-v.minLb));
 if(!Number.isFinite(maximumTensionLb)||!Number.isFinite(maximumCompressionLb))
   throw new Error("Invalid governing axial demands");
 return {status:"PRELIMINARY_NOT_ENGINEERED",
   designCandidateCount:memberDemandPreviews.length,memberDemandPreviews,
   maximumTensionLb,maximumCompressionLb,
   scenarioIds:analysis.cases.map(c=>c.id),
   warnings:[...analysis.warnings,
    "Candidate cross-section stress is not a strength or stability capacity check.",
    "No member is approved for fabrication or automatically selected."]};
}
