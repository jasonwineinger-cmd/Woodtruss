import type { ElasticFrameInput } from "./elastic-frame-solve.js";

type Frame=Pick<ElasticFrameInput, "nodes" | "members">;
type MemberSelection={memberId:string;startNodeId:string;endNodeId:string;stationsIn:number[]};
function ownDataField(value:object,key:PropertyKey){
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  return !!descriptor?.enumerable&&Object.hasOwn(descriptor,"value");
}
const memberKeys=["memberId","startNodeId","endNodeId","stationsIn"] as const;
function exact<K extends string>(value:unknown,keys:readonly K[]):value is Record<K,unknown>{
  return !!value&&typeof value==="object"&&!Array.isArray(value)&&
    (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)&&
    Reflect.ownKeys(value).length===keys.length&&keys.every(key=>ownDataField(value,key));
}
function dense(value:unknown,max:number):value is unknown[]{
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length<1||value.length>max||Reflect.ownKeys(value).length!==value.length+1)return false;
  for(let i=0;i<value.length;i++)if(!ownDataField(value,i))return false;
  return true;
}

/** Select exact modeled joints and stations along directed members from a
 * previously bounded authored request. No interpolation, defaults or solve. */
export function bindAuthoredFrameDisplacementSelection(
  frame:Frame,nodeIds:unknown,memberStations:unknown,fail:(message:string)=>Error,
):{
  nodeIds:string[];members:MemberSelection[];
}{
  const nodes=new Map(frame.nodes.map(node=>[node.id,node]));
  const members=new Map(frame.members.map(member=>[member.id,member]));
  if(!dense(nodeIds,nodes.size)||!dense(memberStations,members.size))
    throw fail("explicit bounded node and member station arrays required");
  const seenNodes=new Set<string>(),seenMembers=new Set<string>();
  const pickedNodes=nodeIds.map(id=>{
    if(typeof id!=="string"||!nodes.has(id)||seenNodes.has(id))
      throw fail("node IDs must be exact and distinct modeled identities");
    seenNodes.add(id);
    return id;
  });
  const pickedMembers=memberStations.map(entry=>{
    if(!exact(entry,memberKeys))throw fail("exact member station selection fields required");
    const {memberId,startNodeId,endNodeId,stationsIn}=entry;
    const member=typeof memberId==="string"?members.get(memberId):undefined;
    if(typeof memberId!=="string"||!member||seenMembers.has(memberId)||
      startNodeId!==member.startNodeId||endNodeId!==member.endNodeId)
      throw fail("member identity and directed endpoints must match one distinct authored member");
    seenMembers.add(memberId);
    const a=nodes.get(member.startNodeId),b=nodes.get(member.endNodeId);
    if(!a||!b)throw fail("directed member endpoints are not modeled");
    const lengthIn=Math.hypot(b.xIn-a.xIn,b.yIn-a.yIn);
    if(!Number.isFinite(lengthIn)||lengthIn<=0)throw fail("member length is not usable");
    if(!dense(stationsIn,64))throw fail("one to 64 explicit stations are required per member");
    const seenStations=new Set<number>();
    const stations=stationsIn.map(station=>{
      if(typeof station!=="number"||!Number.isFinite(station)||station<0||station>lengthIn||seenStations.has(station))
        throw fail("stations must be distinct, finite and within the actual directed member length");
      seenStations.add(station);
      return station===0?0:station;
    });
    return {memberId,startNodeId:member.startNodeId,endNodeId:member.endNodeId,stationsIn:stations};
  });
  return {nodeIds:pickedNodes,members:pickedMembers};
}
