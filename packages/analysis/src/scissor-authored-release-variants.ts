import type {buildScissorAuthoredElasticFrameModel} from "./scissor-authored-elastic-frame-model.js";
import {snapshotElasticFrameReviewData} from "./elastic-frame-reviewed-plain-data.js";

type Frame=ReturnType<typeof buildScissorAuthoredElasticFrameModel>;
type Release={memberId:string;startNodeId:string;endNodeId:string;releaseStartRotation:boolean;releaseEndRotation:boolean};
type Variant={variantId:string;sourceRef:string;overrides:Release[];frame:Frame};
const record=(value:unknown,keys:readonly string[]):value is Record<string,unknown>=>
  !!value&&typeof value==="object"&&!Array.isArray(value)&&
  Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const fail=(message:string)=>new Error(`Scissor release variants: ${message}`);

/** Bounded changes to explicit release flags on a previously bound frame.
 * Empty overrides are the unchanged baseline; redundant per-member overrides
 * are accepted but cannot distinguish otherwise identical complete variants.
 * This is not a model solve, evidence of physical fixity, or approval. */
export function buildAuthoredScissorReleaseVariants(frame:Frame,input:unknown):Variant[] {
  const value=snapshotElasticFrameReviewData(input);
  if(!Array.isArray(value)||value.length<2||value.length>6)throw fail("two to six ordered variants required");
  const detached=snapshotElasticFrameReviewData(frame) as Frame;
  if(!record(detached,["nodes","members","supports"])||
      !Array.isArray(detached.nodes)||!Array.isArray(detached.members)||!Array.isArray(detached.supports))
    throw fail("valid bound base frame required");
  const baseNodes=Object.freeze(detached.nodes.map(node=>Object.freeze({...node})));
  const baseSupports=Object.freeze(detached.supports.map(support=>Object.freeze({...support})));
  const baseMembers=detached.members.map(member=>Object.freeze({...member,
    ...(member.shear?{shear:Object.freeze({...member.shear})}:{})}));
  const definitions=new Map(baseMembers.map(member=>[member.id,member]));
  if(definitions.size!==baseMembers.length||!definitions.size||
      baseMembers.some(m=>typeof m.releaseStartRotation!=="boolean"||typeof m.releaseEndRotation!=="boolean"))
    throw fail("valid explicitly released base frame required");
  const names=new Set<string>(),configurations=new Set<string>();
  return (value as unknown[]).map(raw=>{
    if(!record(raw,["variantId","sourceRef","overrides"]))throw fail("exact variant fields required");
    const {variantId,sourceRef}=raw;
    if(typeof variantId!=="string"||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(variantId)||names.has(variantId))
      throw fail("invalid or repeated variant ID");
    if(typeof sourceRef!=="string"||!sourceRef||sourceRef.trim()!==sourceRef||sourceRef.length>300)
      throw fail("explicit bounded source reference required");
    if(!Array.isArray(raw.overrides)||raw.overrides.length>definitions.size)throw fail("bounded overrides required");
    const byMember=new Map<string,Release>();
    const overrides=(raw.overrides as unknown[]).map(entry=>{
      if(!record(entry,["memberId","startNodeId","endNodeId","releaseStartRotation","releaseEndRotation"]))
        throw fail("exact override fields required");
      const {memberId,startNodeId,endNodeId,releaseStartRotation,releaseEndRotation}=entry;
      const original=typeof memberId==="string"?definitions.get(memberId):undefined;
      if(typeof memberId!=="string"||!original||byMember.has(memberId)||
          startNodeId!==original.startNodeId||endNodeId!==original.endNodeId||
          typeof releaseStartRotation!=="boolean"||typeof releaseEndRotation!=="boolean")
        throw fail("invalid, repeated or mismatched directed member override");
      const override={memberId,startNodeId:original.startNodeId,endNodeId:original.endNodeId,
        releaseStartRotation,releaseEndRotation};
      byMember.set(memberId,override);
      return override;
    });
    const members=baseMembers.map(member=>{
      const override=byMember.get(member.id);
      return override?{...member,releaseStartRotation:override.releaseStartRotation,
        releaseEndRotation:override.releaseEndRotation}:member;
    });
    const key=members.map(member=>`${Number(member.releaseStartRotation)}${Number(member.releaseEndRotation)}`).join("");
    if(configurations.has(key))throw fail("duplicate complete release configuration");
    names.add(variantId);
    configurations.add(key);
    return {variantId,sourceRef,overrides,frame:{nodes:baseNodes,members,supports:baseSupports}};
  });
}
