import type {CommonGravityCase} from "./gravity-case.js";
import {analyzeCommonGravityCase} from "./gravity-case.js";
import {summarizeMemberDemands} from "../../lumber/src/index.js";
import {auditTrussModel} from "./model-audit.js";

/** One-call preliminary analysis report. NOT a truss design certificate. */
export interface CommonTrussStudy {
 status:"PRELIMINARY_NOT_ENGINEERED";
 inputs:CommonGravityCase;
 appliedGravityLb:number;
 reactionLeftLb:{x:number;y:number};
 reactionRightLb:{x:number;y:number};
 maximumAbsoluteAxialLb:number;
 maximumDisplacementIn:number;
 memberDemands:ReturnType<typeof summarizeMemberDemands>;
 warnings:string[];
}
export function runCommonTrussStudy(inputs:CommonGravityCase):CommonTrussStudy {
 const a=analyzeCommonGravityCase(inputs);
 const audit=auditTrussModel(a.model);
 if(!audit.valid||!a.equilibrium.passes)throw new Error("Structural model validation failed");
 const memberDemands=summarizeMemberDemands(a.model,a.result);
 const maximumAbsoluteAxialLb=Math.max(...memberDemands.map(m=>Math.abs(m.axialForceLb)));
 const maximumDisplacementIn=Math.max(...Object.values(a.result.displacementIn)
   .map(d=>Math.hypot(d.x,d.y)));
 if(!Number.isFinite(maximumAbsoluteAxialLb)||!Number.isFinite(maximumDisplacementIn))
   throw new Error("Nonfinite structural result");
 return {
  status:"PRELIMINARY_NOT_ENGINEERED",inputs:structuredClone(inputs),
  appliedGravityLb:a.totalAppliedGravityLb,
  reactionLeftLb:{...a.result.reactionLb.L},
  reactionRightLb:{...a.result.reactionLb.E},
  maximumAbsoluteAxialLb,maximumDisplacementIn,memberDemands,
  warnings:[...a.warnings,"Deflections are for an idealized pin-jointed model only.",
   "Member stresses are demands, not allowable strengths; do not fabricate from this report."]
 };
}
