import type {RoofInput} from "../../geometry/src/index.js";
import {generateScissorTopology} from "../../geometry/src/scissor.js";
import {analyzePinJointedTruss,type TrussModel,type TrussResult} from "./index.js";
import {roofGravityNodalLoads} from "./loading.js";
import {assertAuditedTrussModel} from "./model-audit.js";
import {auditGlobalEquilibrium,type EquilibriumAudit} from "./equilibrium.js";
import {auditJointEquilibrium,type JointEquilibriumAudit} from "./joint-equilibrium.js";

export interface ScissorGravityInput {
 roof:RoofInput;
 areaIn2:number;
 elasticModulusPsi:number;
 roofPressurePsf:number;
 trussSpacingFt:number;
}
export interface ScissorGravityResult {
 model:TrussModel;
 result:TrussResult;
 equilibrium:EquilibriumAudit;
 jointEquilibrium:JointEquilibriumAudit;
 totalAppliedGravityLb:number;
 status:"PRELIMINARY_NOT_ENGINEERED";
 warnings:string[];
}
/** Pin-jointed scissor schematic for numerical experiments only. */
export function analyzeScissorGravity(input:ScissorGravityInput):ScissorGravityResult {
 if(!Number.isFinite(input.areaIn2)||input.areaIn2<=0||
    !Number.isFinite(input.elasticModulusPsi)||input.elasticModulusPsi<=0)
   throw new Error("Invalid member properties");
 const topology=generateScissorTopology(input.roof);
 const nodes=topology.joints.map(j=>({id:j.id,x:j.position.x,y:j.position.y}));
 const loads=roofGravityNodalLoads({nodes},{topChordNodeIds:["L","Q1","R","Q3","E"],
   roofPressurePsf:input.roofPressurePsf,trussSpacingFt:input.trussSpacingFt});
 const model:TrussModel={
  nodes,bars:topology.members.map(m=>({id:m.id,a:m.start,b:m.end,
   areaIn2:input.areaIn2,elasticModulusPsi:input.elasticModulusPsi})),
  loads,supports:[{nodeId:"L",fixX:true,fixY:true},{nodeId:"E",fixX:false,fixY:true}]
 };
 assertAuditedTrussModel(model);
 const result=analyzePinJointedTruss(model);
 const equilibrium=auditGlobalEquilibrium(model,result);
 if(!equilibrium.passes)throw new Error("Scissor model equilibrium audit failed");
 const jointEquilibrium=auditJointEquilibrium(model,result.axialForceLb,result.reactionLb);
 if(!jointEquilibrium.passes)throw new Error("Scissor joint force equilibrium audit failed");
 return {model,result,equilibrium,jointEquilibrium,
  totalAppliedGravityLb:-loads.reduce((sum,l)=>sum+(l.fyLb??0),0),
  status:"PRELIMINARY_NOT_ENGINEERED",
  warnings:[...topology.warnings,
   "Pin-jointed schematic omits chord bending, plate slip, eccentricity, support restraint and member instability.",
   "Not a building-code load combination or manufacturing approval."]};
}
