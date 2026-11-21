import {generateCommonTopology} from "../../geometry/src/topology.js";
import type {RoofInput} from "../../geometry/src/index.js";
import {analyzePinJointedTruss,type TrussModel,type TrussResult} from "./index.js";

export interface PreliminaryAnalysisInput {
  roof: RoofInput;
  /** Schematic, uniform properties for all members; NOT lumber design values. */
  areaIn2: number;
  elasticModulusPsi: number;
  /** Vertical load applied at ridge joint; negative values point down. */
  ridgeLoadLb: number;
}
export interface PreliminaryAnalysis {
  model: TrussModel;
  result: TrussResult;
  warnings: string[];
}
/** Maps a schematic common-truss topology to an idealized pin-jointed analysis model.
 * Does not model plate slip, bending, heel eccentricity, distributed loads, or bracing.
 */
export function analyzePreliminaryCommonTruss(input: PreliminaryAnalysisInput): PreliminaryAnalysis {
  if(!Number.isFinite(input.areaIn2)||input.areaIn2<=0||
     !Number.isFinite(input.elasticModulusPsi)||input.elasticModulusPsi<=0||
     !Number.isFinite(input.ridgeLoadLb)) throw new Error("Invalid analysis inputs");
  const topology=generateCommonTopology(input.roof);
  const model:TrussModel={
    nodes:topology.joints.map(j=>({id:j.id,x:j.position.x,y:j.position.y})),
    bars:topology.members.map(m=>({
      id:m.id,a:m.start,b:m.end,areaIn2:input.areaIn2,
      elasticModulusPsi:input.elasticModulusPsi
    })),
    loads:[{nodeId:"R",fyLb:input.ridgeLoadLb}],
    supports:[{nodeId:"L",fixX:true,fixY:true},{nodeId:"E",fixX:false,fixY:true}]
  };
  const result=analyzePinJointedTruss(model);
  return {model,result,warnings:[
    ...topology.warnings,
    "Idealized ridge point load only; not a roof design load combination.",
    "Uniform illustrative member properties; no lumber grading or member capacity checks.",
    "Not suitable for fabrication, permitting, or engineering approval."
  ]};
}
