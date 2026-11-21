import type { JointLoad, TrussModel } from "./index.js";

export interface ExplicitNodalLoadChannel {
  id:string;
  provenance:string;
  loads:readonly JointLoad[];
}
type ResolvedJointLoad = {nodeId:string;fxLb:number;fyLb:number};
const label=(value:string)=>typeof value==="string"&&value.length>0&&value===value.trim();

/** Sum independently authored channels, without applying factors or treating
 * model.loads as an implicit channel. Retain a copied contribution ledger. */
export function aggregateExplicitNodalLoadChannels(model:Pick<TrussModel,"nodes">, channels:readonly ExplicitNodalLoadChannel[]) {
  if(!channels.length)throw new Error("At least one explicit load channel required");
  const nodeIds=new Set(model.nodes.map(node=>node.id));
  if(nodeIds.size!==model.nodes.length||[...nodeIds].some(id=>!label(id)))
    throw new Error("Missing or duplicate modeled node ID");
  const channelIds=new Set<string>();
  const totals=new Map<string,ResolvedJointLoad>();
  const contributions=channels.map(channel=>{
    if(!label(channel.id)||!label(channel.provenance))throw new Error("Channel ID and provenance required");
    if(channelIds.has(channel.id))throw new Error("Duplicate load channel ID: "+channel.id);
    channelIds.add(channel.id);
    if(!channel.loads.length)throw new Error("Each channel requires explicit joint loads: "+channel.id);

    const joints=new Set<string>();
    const loads=channel.loads.map(load=>{
      if(!nodeIds.has(load.nodeId))throw new Error("Unknown channel joint: "+load.nodeId);
      if(joints.has(load.nodeId))throw new Error("Duplicate joint in load channel: "+channel.id+" / "+load.nodeId);
      joints.add(load.nodeId);
      const fx=load.fxLb===undefined?0:load.fxLb, fy=load.fyLb===undefined?0:load.fyLb;
      if(!Number.isFinite(fx)||!Number.isFinite(fy))throw new Error("Nonfinite channel load: "+channel.id);
      const previous=totals.get(load.nodeId);
      const fxLb=(previous?.fxLb??0)+fx, fyLb=(previous?.fyLb??0)+fy;
      if(!Number.isFinite(fxLb)||!Number.isFinite(fyLb))throw new Error("Channel accumulation overflow: "+load.nodeId);
      totals.set(load.nodeId,{nodeId:load.nodeId,fxLb,fyLb});
      return {nodeId:load.nodeId,fxLb:fx,fyLb:fy};
    });
    return {id:channel.id,provenance:channel.provenance,loads};
  });

  const jointLoads=model.nodes.flatMap(({id})=>{
    const load=totals.get(id);
    return load?[load]:[];
  });
  return {jointLoads,contributions,status:"PRELIMINARY_NOT_ENGINEERED" as const,
    warnings:["Signed authored contributions only; no building-code classes, factors, or combinations are inferred.",
      "No engineering approval or manufacturing release."]};
}
