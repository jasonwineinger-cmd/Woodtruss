import {generateScissorTopology} from "../../geometry/src/scissor.js";
import {snapshotElasticFrameReviewData} from "./elastic-frame-reviewed-plain-data.js";
import {bindDirectedAuthoredFrame} from "./directed-authored-frame-binding.js";

type DataRecord=Record<string,unknown>;
const roofKeys=["family","spanFt","pitchRisePer12","bottomPitchRisePer12"] as const;
const isRecord=(value:unknown):value is DataRecord=>!!value&&typeof value==="object"&&!Array.isArray(value);
const exact=(value:unknown,fields:readonly string[]):value is DataRecord=>
  isRecord(value)&&Object.keys(value).length===fields.length&&fields.every(key=>Object.hasOwn(value,key));
const number=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value);
const fail=(message:string)=>new Error(`Scissor frame: ${message}`);

function parseRoof(value:unknown){
  if(!isRecord(value))throw fail("an exact scissor roof is required");
  const fields:string[]=[...roofKeys];
  for(const key of ["heelHeightIn","overhangIn"]){
    if(Object.hasOwn(value,key)){
      if(value[key]!==0)throw fail("raised heels and overhangs must be absent or explicitly zero");
      fields.push(key);
    }
  }
  const {family,spanFt,pitchRisePer12,bottomPitchRisePer12}=value;
  if(!exact(value,fields)||family!=="scissor"||!number(spanFt)||!number(pitchRisePer12)||!number(bottomPitchRisePer12))
    throw fail("exact finite scissor roof fields required");
  return {family,spanFt,pitchRisePer12,bottomPitchRisePer12} as const;
}
/** Bind explicit authored elastic properties and supports to the exact scissor topology. */
export function buildScissorAuthoredElasticFrameModel(input:unknown) {
  const data=snapshotElasticFrameReviewData(input);
  if(!exact(data,["roof","memberAssignments","supports"]))throw fail("exact model input fields required");
  const topology=generateScissorTopology(parseRoof(data.roof));
  return bindDirectedAuthoredFrame(topology,data.memberAssignments,data.supports,fail);
}
