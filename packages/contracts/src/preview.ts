import type {TrussModel,TrussResult} from "../../analysis/src/index.js";
import type {LoadEnvelope} from "../../analysis/src/envelope.js";

/** Read-only schema for future Prefab Panelizer integration.
 * All dimensions are inches, forces pounds. No fabrication output is authorized.
 */
export interface PreliminaryTrussPackage {
 schemaVersion:"woodtruss.preview.v1";
 designId:string;
 revisionId:string;
 units:{length:"in";force:"lb"};
 geometry:{nodes:TrussModel["nodes"];members:TrussModel["bars"]};
 caseEnvelope:LoadEnvelope;
 status:"PRELIMINARY_NOT_ENGINEERED";
 fabricationAuthorized:false;
 warnings:string[];
}
export function createPreliminaryTrussPackage(
 designId:string,revisionId:string,model:TrussModel,envelope:LoadEnvelope
):PreliminaryTrussPackage {
 if(!designId.trim()||!revisionId.trim())throw new Error("Design and revision required");
 if(envelope.status!=="PRELIMINARY_NOT_ENGINEERED")throw new Error("Unsupported envelope");
 if(model.nodes.length<2||model.bars.length<1)throw new Error("Missing truss geometry");
 return {
  schemaVersion:"woodtruss.preview.v1",designId,revisionId,
  units:{length:"in",force:"lb"},
  geometry:{nodes:model.nodes.map(n=>({...n})),members:model.bars.map(b=>({...b}))},
  caseEnvelope:structuredClone(envelope),
  status:"PRELIMINARY_NOT_ENGINEERED",fabricationAuthorized:false,
  warnings:["Preview only. This package must never be used to cut, press, fabricate, or erect trusses.",
    "Truss geometry, wood capacity, connector plate design, load cases and engineering review remain incomplete."]
 };
}
