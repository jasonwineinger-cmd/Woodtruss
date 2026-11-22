import type {ElasticFrameInput,solveElasticFrame} from "./elastic-frame-solve.js";
import {createInclinedSupportAxis} from "../../geometry/src/inclined-support-axis.js";

type Frame=Pick<ElasticFrameInput,"nodes"|"members"|"supports">;
type Actions=Pick<ElasticFrameInput,"loads"|"memberLoads"|"memberPointLoads">;
type Reactions=ReturnType<typeof solveElasticFrame>["reactions"];
type Resultant={fxLb:number;fyLb:number;momentLbIn:number};
type Position={xFromOriginIn:number;yFromOriginIn:number};
type LocatedResultant=Resultant&Position&{coupleLbIn:number};
type AppliedRow=LocatedResultant&(
  {kind:"nodal";nodeId:string}|
  {kind:"uniform";memberId:string;basis:"member-length"|"horizontal-projection";loadedMeasureIn:number}|
  {kind:"point";memberId:string;stationIn:number}
);
type SupportRow=LocatedResultant&{kind:"support";nodeId:string};

const fields=["fxLb","fyLb","momentLbIn"] as const;
const validId=(value:unknown):value is string=>typeof value==="string"&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(value);
const finite=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value);
const range=()=>new Error("Elastic frame physical resultant outside the usable numeric range");
function exact(value:unknown,keys:readonly string[]) {
  return !!value&&typeof value==="object"&&!Array.isArray(value)&&
    Reflect.ownKeys(value).length===keys.length&&keys.every(key=>Object.prototype.propertyIsEnumerable.call(value,key));
}
const zero=(value:number)=>value===0?0:value;
function multiply(a:number,b:number){
  const value=a*b;
  if(!finite(value)||(value===0&&a!==0&&b!==0))throw range();
  return zero(value);
}
function add(a:number,b:number){
  const result=a+b;
  if(!finite(result))throw range();
  return zero(result);
}
function compensated(values:readonly number[]){
  let sum=0,correction=0;
  for(const value of values){
    const next=add(sum,value);
    correction=add(correction,Math.abs(sum)>=Math.abs(value)?add(sum-next,value):add(value-next,sum));
    sum=next;
  }
  return add(sum,correction);
}

function located(pos:Position,fxLb:number,fyLb:number,coupleLbIn=0):LocatedResultant {
  if(![fxLb,fyLb,coupleLbIn].every(finite))throw range();
  const {xFromOriginIn:x,yFromOriginIn:y}=pos;
  return {...pos,fxLb:zero(fxLb),fyLb:zero(fyLb),coupleLbIn:zero(coupleLbIn),
    momentLbIn:compensated([coupleLbIn,multiply(x,fyLb),-multiply(y,fxLb)])};
}
function total(rows:readonly Resultant[]):Resultant{
  return {fxLb:compensated(rows.map(row=>row.fxLb)),fyLb:compensated(rows.map(row=>row.fyLb)),
    momentLbIn:compensated(rows.map(row=>row.momentLbIn))};
}

/** Recompute physical global force and moment about an explicit modeled node.
 * Store authored action rows before accumulating; no equivalent nodal loads or
 * previously reported extrema/residuals are inputs. This audits equilibrium,
 * not support behavior, capacity, connections or fabrication. */
export function buildElasticFramePhysicalResultant(
  frame:Frame,actions:Actions,reactions:Reactions,originNodeId:string,
) {
  const {nodes,members,supports}=frame;
  if(!Array.isArray(nodes)||!nodes.length||nodes.length>50||!Array.isArray(members)||members.length>100||
     !Array.isArray(supports)||!supports.length||supports.length>nodes.length)
    throw new Error("Invalid bounded frame identities for physical resultant");
  const nodeById=new Map<string,Frame["nodes"][number]>();
  for(const node of nodes){
    if(!node||!validId(node.id)||nodeById.has(node.id)||![node.xIn,node.yIn].every(finite))
      throw new Error("Invalid or repeated physical resultant node");
    nodeById.set(node.id,node);
  }
  const origin=nodeById.get(originNodeId);
  if(!origin)throw new Error("Physical resultant requires an exact modeled origin node");
  const posOf=(node:Frame["nodes"][number]):Position=>({
    xFromOriginIn:add(node.xIn,-origin.xIn),yFromOriginIn:add(node.yIn,-origin.yIn),
  });
  const memberById=new Map<string,Frame["members"][number]>();
  for(const m of members){
    if(!m||!validId(m.id)||memberById.has(m.id)||m.startNodeId===m.endNodeId||
      !nodeById.has(m.startNodeId)||!nodeById.has(m.endNodeId))throw new Error("Invalid physical resultant member identity");
    memberById.set(m.id,m);
  }
  function axis(memberId:string){
    const m=memberById.get(memberId);
    if(!m)throw new Error("Physical action uses an unknown member");
    const a=nodeById.get(m.startNodeId)!,b=nodeById.get(m.endNodeId)!;
    const dx=add(b.xIn,-a.xIn),dy=add(b.yIn,-a.yIn),length=Math.hypot(dx,dy);
    if(!finite(length)||length<=0)throw range();
    return {start:posOf(a),dx,dy,length};
  }
  function atOffset(start:Position,dx:number,dy:number):Position{
    return {xFromOriginIn:add(start.xFromOriginIn,dx),yFromOriginIn:add(start.yFromOriginIn,dy)};
  }

  const required=["loads"];
  if(Object.hasOwn(actions,"memberLoads"))required.push("memberLoads");
  if(Object.hasOwn(actions,"memberPointLoads"))required.push("memberPointLoads");
  const {loads,memberLoads=[],memberPointLoads=[]}=actions;
  if(!exact(actions,required)||!Array.isArray(loads)||!Array.isArray(memberLoads)||!Array.isArray(memberPointLoads)||
      loads.length>nodes.length||memberLoads.length>members.length||memberPointLoads.length>members.length||
      !(loads.length+memberLoads.length+memberPointLoads.length)||
      (required.includes("memberLoads")&&actions.memberLoads===undefined)||
      (required.includes("memberPointLoads")&&actions.memberPointLoads===undefined))
    throw new Error("Invalid explicit physical resultant action arrays");
  const appliedRows:AppliedRow[]=[];
  const nodeActions=new Set<string>(),uniformActions=new Set<string>(),pointActions=new Set<string>();
  for(const action of loads){
    if(!exact(action,["nodeId",...fields])||nodeActions.has(action.nodeId))
      throw new Error("Invalid or repeated nodal physical action");
    const node=nodeById.get(action.nodeId);
    if(!node)throw new Error("Physical action uses an unknown node");
    nodeActions.add(action.nodeId);
    appliedRows.push({kind:"nodal",nodeId:action.nodeId,...located(posOf(node),action.fxLb,action.fyLb,action.momentLbIn)});
  }
  for(const action of memberLoads){
    if(!exact(action,["memberId","basis","qxLbPerIn","qyLbPerIn"])||uniformActions.has(action.memberId)||
      (action.basis!=="member-length"&&action.basis!=="horizontal-projection")||
      ![action.qxLbPerIn,action.qyLbPerIn].every(finite))throw new Error("Invalid or repeated uniform physical action");
    uniformActions.add(action.memberId);
    const {start,dx,dy,length}=axis(action.memberId);
    const loadedMeasureIn=action.basis==="member-length"?length:Math.abs(dx);
    if(loadedMeasureIn<=0)throw new Error("Physical uniform action requires positive authored projection");
    const midpoint=atOffset(start,multiply(dx,.5),multiply(dy,.5));
    appliedRows.push({kind:"uniform",memberId:action.memberId,basis:action.basis,loadedMeasureIn,
      ...located(midpoint,multiply(action.qxLbPerIn,loadedMeasureIn),multiply(action.qyLbPerIn,loadedMeasureIn))});
  }
  for(const action of memberPointLoads){
    if(!exact(action,["memberId","stationIn","fxLb","fyLb"])||pointActions.has(action.memberId))
      throw new Error("Invalid or repeated point physical action");
    pointActions.add(action.memberId);
    const {start,dx,dy,length}=axis(action.memberId);
    if(!finite(action.stationIn)||!(action.stationIn>0&&action.stationIn<length))
      throw new Error("Physical point action requires an explicitly interior station");
    const scale=Math.max(Math.abs(dx),Math.abs(dy)),nx=dx/scale,ny=dy/scale,norm=Math.hypot(nx,ny);
    const ux=nx/norm,uy=ny/norm;
    if((dx!==0&&ux===0)||(dy!==0&&uy===0))throw range();
    const pos=atOffset(start,multiply(ux,action.stationIn),multiply(uy,action.stationIn));
    appliedRows.push({kind:"point",memberId:action.memberId,stationIn:action.stationIn,...located(pos,action.fxLb,action.fyLb)});
  }

  if(!exact(reactions,[...nodeById.keys()]))throw new Error("Physical resultant reactions must match the exact frame nodes");
  const supportRows:SupportRow[]=[],supported=new Set<string>();
  for(const support of supports){
    if(!support||supported.has(support.nodeId)||!nodeById.has(support.nodeId))
      throw new Error("Invalid or repeated physical resultant support");
    supported.add(support.nodeId);
    const node=nodeById.get(support.nodeId)!,r=reactions[support.nodeId];
    if(!exact(r,fields)||!fields.every(key=>finite(r[key]))||
       (support.fixRotation===false&&r.momentLbIn!==0)||
       ("fixX" in support&&((!support.fixX&&r.fxLb!==0)||(!support.fixY&&r.fyLb!==0))))
      throw new Error("Physical reaction is invalid or contradicts its authored support");
    if("freeDx" in support){
      const {freeGlobal}=createInclinedSupportAxis({kind:"direction",dx:support.freeDx,dy:support.freeDy});
      const scale=Math.max(1,Math.abs(r.fxLb),Math.abs(r.fyLb));
      const tangent=r.fxLb/scale*freeGlobal.x+r.fyLb/scale*freeGlobal.y;
      if(!finite(tangent)||Math.abs(tangent)>1e-7)
        throw new Error("Physical reaction acts along an authored free support tangent");
    }
    supportRows.push({kind:"support",nodeId:node.id,...located(posOf(node),r.fxLb,r.fyLb,r.momentLbIn)});
  }
  for(const id of nodeById.keys())if(!supported.has(id)){
    const r=reactions[id];
    if(!exact(r,fields)||!fields.every(key=>r[key]===0))
      throw new Error("Physical reaction was recorded away from an authored support");
  }
  const applied=total(appliedRows),support=total(supportRows),rows=[...appliedRows,...supportRows],residual=total(rows);
  for(const field of fields){
    const scale=Math.max(1,...rows.map(row=>Math.abs(row[field])));
    const normalizedAbsolute=rows.reduce((sum,row)=>sum+Math.abs(row[field])/scale,0);
    if(Math.abs(residual[field])/scale>1e-7*Math.max(1/scale,normalizedAbsolute))
      throw new Error("Independent physical frame resultant does not close in signed equilibrium");
  }
  return {originNodeId,appliedRows,supportRows,applied,support,residual};
}
