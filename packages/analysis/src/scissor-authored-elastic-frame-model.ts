import {generateScissorTopology} from "../../geometry/src/scissor.js";
import {createInclinedSupportAxis} from "../../geometry/src/inclined-support-axis.js";
import {snapshotElasticFrameReviewData} from "./elastic-frame-reviewed-plain-data.js";
import type {ElasticFrameInput} from "./elastic-frame-solve.js";

type ScissorFrame=Pick<ElasticFrameInput,"nodes"|"members"|"supports">;
type ModelMember=ScissorFrame["members"][number];
type Support=ScissorFrame["supports"][number];
type DataRecord=Record<string,unknown>;
const roofKeys=["family","spanFt","pitchRisePer12","bottomPitchRisePer12"] as const;
const memberKeys=["memberId","startNodeId","endNodeId","areaIn2","secondMomentIn4","elasticModulusPsi",
  "releaseStartRotation","releaseEndRotation"] as const;
const isRecord=(value:unknown):value is DataRecord=>!!value&&typeof value==="object"&&!Array.isArray(value);
const exact=(value:unknown,fields:readonly string[]):value is DataRecord=>
  isRecord(value)&&Object.keys(value).length===fields.length&&fields.every(key=>Object.hasOwn(value,key));
const number=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value);
const positive=(value:unknown):value is number=>number(value)&&value>0;
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
function parseSupports(value:unknown):Support[]{
  if(!Array.isArray(value)||value.length!==2)throw fail("exactly two explicit bearing supports required");
  const seen=new Set<string>();
  return value.map((support:unknown)=>{
    if(!isRecord(support))throw fail("invalid bearing support");
    const {nodeId,fixRotation}=support;
    if((nodeId!=="L"&&nodeId!=="E")||seen.has(nodeId)||typeof fixRotation!=="boolean")
      throw fail("supports must identify distinct authored L/E bearings with explicit rotation flags");
    seen.add(nodeId);
    if(exact(support,["nodeId","fixX","fixY","fixRotation"])){
      const {fixX,fixY}=support;
      if(typeof fixX!=="boolean"||typeof fixY!=="boolean"||!(fixX||fixY||fixRotation))
        throw fail("invalid explicit Cartesian support restraints");
      return {nodeId,fixX,fixY,fixRotation};
    }
    if(exact(support,["nodeId","freeDx","freeDy","fixRotation"])){
      const {freeDx,freeDy}=support;
      if(!number(freeDx)||!number(freeDy))throw fail("invalid explicit inclined support direction");
      createInclinedSupportAxis({kind:"direction",dx:freeDx,dy:freeDy});
      return {nodeId,freeDx,freeDy,fixRotation};
    }
    throw fail("unknown bearing support fields");
  });
}

/** Map separately authored section properties, end releases and bearing rules
 * onto the existing schematic scissor topology. Member identity is directed.
 * The topology remains geometric only; this binder does not solve, select
 * material, infer fixity, prove stability or approve fabrication. */
export function buildScissorAuthoredElasticFrameModel(input:unknown):ScissorFrame {
  const data=snapshotElasticFrameReviewData(input);
  if(!exact(data,["roof","memberAssignments","supports"]))throw fail("exact model input fields required");
  const topology=generateScissorTopology(parseRoof(data.roof));
  const nodes=topology.joints.map(({id,position})=>({id,xIn:position.x,yIn:position.y}));
  const geometry=new Map(topology.members.map(member=>[member.id,member]));
  const points=new Map(nodes.map(node=>[node.id,node]));
  const {memberAssignments}=data;
  if(!Array.isArray(memberAssignments)||memberAssignments.length!==geometry.size)
    throw fail("one authored assignment per topology member required");

  const assigned=new Map<string,ModelMember>();
  for(const value of memberAssignments as readonly unknown[]){
    if(!isRecord(value))throw fail("invalid member assignment");
    const fields=Object.hasOwn(value,"shear")?[...memberKeys,"shear"]:memberKeys;
    if(!exact(value,fields))throw fail("unknown or missing member assignment fields");
    const {memberId,startNodeId,endNodeId,areaIn2,secondMomentIn4,elasticModulusPsi,releaseStartRotation,releaseEndRotation}=value;
    const topologyMember=typeof memberId==="string"?geometry.get(memberId):undefined;
    if(typeof memberId!=="string"||!topologyMember||assigned.has(memberId)||
        startNodeId!==topologyMember.start||endNodeId!==topologyMember.end)
      throw fail("unknown, duplicate or wrong directed member assignment");
    if(!positive(areaIn2)||!positive(secondMomentIn4)||!positive(elasticModulusPsi)||
        typeof releaseStartRotation!=="boolean"||typeof releaseEndRotation!=="boolean")
      throw fail("explicit positive section and stiffness properties and both end release booleans required");
    const first=points.get(topologyMember.start)!,last=points.get(topologyMember.end)!;
    if(first.xIn===last.xIn&&first.yIn===last.yIn)throw fail("roof results in an unresolved zero-length member");
    const member={id:memberId,startNodeId:topologyMember.start,endNodeId:topologyMember.end,
      areaIn2,secondMomentIn4,elasticModulusPsi,releaseStartRotation,releaseEndRotation};
    if(Object.hasOwn(value,"shear")){
      const shear=value.shear;
      if(!exact(shear,["shearModulusPsi","effectiveShearAreaIn2"])||
        !positive(shear.shearModulusPsi)||!positive(shear.effectiveShearAreaIn2))
        throw fail("exact positive shear modulus and effective area required");
      assigned.set(memberId,{...member,shear:{shearModulusPsi:shear.shearModulusPsi,effectiveShearAreaIn2:shear.effectiveShearAreaIn2}});
    } else assigned.set(memberId,member);
  }
  return {nodes,members:topology.members.map(({id})=>assigned.get(id)!),supports:parseSupports(data.supports)};
}
