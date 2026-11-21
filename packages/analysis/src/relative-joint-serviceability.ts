import type { NamedCase } from "./envelope.js";
import { envelopeJointDisplacements } from "./displacement-envelope.js";

export interface RelativeYObservation {
  expectedCaseIds:readonly string[];
  nodeId:string;
  leftBearingNodeId:string;
  rightBearingNodeId:string;
  /** Optional non-code comparison threshold supplied by the reviewer. */
  comparison?:{maxAbsoluteIn:number;provenance:string};
}
const hasLabel=(value:string)=>typeof value==="string"&&value.trim()===value&&value.length>0;

/** Preliminary pin-joint translation relative to the linearly interpolated
 * Y translation of two explicit modeled bearing datums, using original X.
 * Not a displacement between deformed points or a code deflection check. */
export function relativeJointYMovement(cases:readonly NamedCase[],input:RelativeYObservation) {
  const ids=input.expectedCaseIds;
  if(!ids.length||ids.some(id=>!hasLabel(id))||new Set(ids).size!==ids.length||
    cases.length!==ids.length||cases.some((entry,i)=>entry.id!==ids[i]))
    throw new Error("Expected ordered solved case scope does not match");
  const {nodeId,leftBearingNodeId,rightBearingNodeId,comparison}=input;
  if(new Set([nodeId,leftBearingNodeId,rightBearingNodeId]).size!==3)
    throw new Error("Distinct observation and bearing datum nodes required");
  if(comparison!==undefined&&(!Number.isFinite(comparison.maxAbsoluteIn)||comparison.maxAbsoluteIn<=0||
    !hasLabel(comparison.provenance)))throw new Error("Invalid user-authored comparison threshold");
  const model=cases[0].model;
  const xyz=[leftBearingNodeId,nodeId,rightBearingNodeId].map(id=>{
    const matches=model.nodes.filter(node=>node.id===id);
    if(matches.length!==1||![matches[0].x,matches[0].y].every(Number.isFinite))
      throw new Error("Unmodeled or invalid observation/datum node: "+id);
    return matches[0].x;
  });
  const fixedY=new Set<string>();
  for(const id of [leftBearingNodeId,rightBearingNodeId]){
    const matches=model.supports.filter(s=>s.nodeId===id);
    if(matches.length!==1||(matches[0].fixX!==true&&matches[0].fixY!==true))
      throw new Error("Bearing datum must have an explicit modeled restraint: "+id);
    if(matches[0].fixY)fixedY.add(id);
  }
  const [leftX,x,rightX]=xyz;
  const span=rightX-leftX;
  if(!Number.isFinite(span)||!(leftX<x&&x<rightX))
    throw new Error("Observation must be strictly between the ordered bearings in model X");

  // Delegate full same-model and preliminary solved-case validation rather
  // than comparing translations across incompatible models/support states.
  envelopeJointDisplacements([...cases]);
  const fraction=(x-leftX)/span;
  const observations=cases.map(({id,result})=>{
    const displacement=(joint:string)=>{
      if(!Object.hasOwn(result.displacementIn,joint))throw new Error("Missing solved datum displacement: "+joint);
      const value=result.displacementIn[joint].y;
      if(!Number.isFinite(value))throw new Error("Nonfinite solved datum displacement: "+joint);
      if(fixedY.has(joint)&&value!==0)throw new Error("Fixed-Y bearing datum has inconsistent solved movement: "+joint);
      return value;
    };
    const leftYIn=displacement(leftBearingNodeId),rightYIn=displacement(rightBearingNodeId);
    const nodeYIn=displacement(nodeId);
    const datumYIn=leftYIn*(1-fraction)+rightYIn*fraction,relativeYIn=nodeYIn-datumYIn;
    if(!Number.isFinite(relativeYIn))throw new Error("Relative joint movement overflow");
    return {caseId:id,leftYIn,rightYIn,nodeYIn,datumYIn,relativeYIn,
      ...(comparison?{withinUserThreshold:Math.abs(relativeYIn)<=comparison.maxAbsoluteIn}:{})};
  });
  return {nodeId,leftBearingNodeId,rightBearingNodeId,fraction,observations,
    ...(comparison?{userThreshold:{...comparison}}:{}),
    status:"PRELIMINARY_NOT_ENGINEERED" as const,
    engineeringApproved:false as const,manufacturingApproved:false as const,
    warnings:["Original-X linear datum interpolation of modeled joint Y translations only.",
      "No code deflection criteria, local chord bending, connector slip, or creep evaluated."]};
}
