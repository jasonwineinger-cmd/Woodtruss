import {generateCommonTopology} from "../../geometry/src/topology.js";
import type {RoofInput} from "../../geometry/src/index.js";
import {analyzePinJointedTruss,type TrussModel,type TrussResult} from "./index.js";
import {roofGravityNodalLoads} from "./loading.js";

export interface CommonGravityCase {
  roof: RoofInput;
  areaIn2: number;
  elasticModulusPsi: number;
  roofPressurePsf: number;
  trussSpacingFt: number;
}
export interface CommonGravityResult {
  model: TrussModel;
  result: TrussResult;
  totalAppliedGravityLb: number;
  warnings: string[];
}
/** Preliminary gravity case, not a code load combination or approved design. */
export function analyzeCommonGravityCase(input:CommonGravityCase):CommonGravityResult {
  const {roof,areaIn2,elasticModulusPsi,roofPressurePsf,trussSpacingFt}=input;
  if(!Number.isFinite(areaIn2)||areaIn2<=0||
     !Number.isFinite(elasticModulusPsi)||elasticModulusPsi<=0)
    throw new Error("Invalid member stiffness parameters");
  const topology=generateCommonTopology(roof);
  const nodes=topology.joints.map(j=>({id:j.id,x:j.position.x,y:j.position.y}));
  const loads=roofGravityNodalLoads({nodes},{
    topChordNodeIds:["L","Q1","R","Q3","E"],roofPressurePsf,trussSpacingFt
  });
  const model:TrussModel={
    nodes,
    bars:topology.members.map(m=>({id:m.id,a:m.start,b:m.end,areaIn2,elasticModulusPsi})),
    loads,
    supports:[{nodeId:"L",fixX:true,fixY:true},{nodeId:"E",fixX:false,fixY:true}]
  };
  const result=analyzePinJointedTruss(model);
  return {model,result,totalAppliedGravityLb:-loads.reduce((sum,l)=>sum+(l.fyLb??0),0),
    warnings:[...topology.warnings,
      "Uniform vertical gravity pressure on horizontal projection only.",
      "No unbalanced snow, wind, uplift, dead/live combinations, eccentricity, joint slip, lumber capacities or plate checks.",
      "NOT ENGINEERED: manufacturing release prohibited."]};
}
