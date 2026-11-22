import type {ElasticFrameInput} from "./elastic-frame-solve.js";

export type ElasticFrameAuthoredActions = Pick<ElasticFrameInput,"loads"|"memberLoads"|"memberPointLoads">;
export type ElasticFrameAuthoredActionTerm = ElasticFrameAuthoredActions & {factor:number};
type NodeAction=ElasticFrameInput["loads"][number];
type UniformAction=NonNullable<ElasticFrameInput["memberLoads"]>[number];
type PointAction=NonNullable<ElasticFrameInput["memberPointLoads"]>[number];

const identifier=(x:unknown):x is string=>typeof x==="string"&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(x);
function plainObject(value:unknown):value is object {
  return !!value&&typeof value==="object"&&
    (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
}
const own=(value:object,key:PropertyKey)=>Object.prototype.propertyIsEnumerable.call(value,key);
function exact(value:unknown,keys:readonly string[]):boolean {
  return plainObject(value)&&Reflect.ownKeys(value).length===keys.length&&keys.every(key=>own(value,key));
}
function dense(value:unknown,maximum:number):boolean {
  if(!Array.isArray(value)||value.length>maximum||Reflect.ownKeys(value).length!==value.length+1)return false;
  for(let index=0;index<value.length;index++)if(!own(value,index))return false;
  return true;
}
const finite=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value);
const zero=(value:number)=>value===0?0:value;
type Compensated = { sum:number; correction:number };
type Accumulated<R,K extends keyof R> = Omit<R,K> & Record<K,Compensated>;
type NodeSum=Accumulated<NodeAction,"fxLb"|"fyLb"|"momentLbIn">;
type UniformSum=Accumulated<UniformAction,"qxLbPerIn"|"qyLbPerIn">;
type PointSum=Accumulated<PointAction,"fxLb"|"fyLb">;

function finish({sum,correction}:Compensated):number {
  const result=sum+correction;
  if(!Number.isFinite(result))throw new Error("Combined frame action accumulation overflow");
  return zero(result);
}

function add(total:Compensated|undefined,factor:number,value:number):Compensated {
  if(!finite(value))throw new Error("Explicit finite signed frame action component required");
  const weighted=factor*value;
  if(!Number.isFinite(weighted)||(value!==0&&weighted===0))
    throw new Error("Weighted frame action overflow or lost nonzero product");
  // Neumaier's correction preserves a small signed contribution between
  // much larger opposite terms regardless of which addend has larger magnitude.
  const before=total?.sum??0;
  const sum=before+weighted;
  if(!Number.isFinite(sum))throw new Error("Combined frame action accumulation overflow");
  const missed=Math.abs(before)>=Math.abs(weighted)?(before-sum)+weighted:(weighted-sum)+before;
  const correction=(total?.correction??0)+missed;
  const next={sum,correction};
  finish(next); // Hold on an overflowing corrected intermediate as well.
  return next;
}

function checkDistinct(seen:Set<string>,id:unknown,kind:string):asserts id is string {
  if(!identifier(id)||seen.has(id))throw new Error(`Invalid or repeated authored ${kind} action identity`);
  seen.add(id);
}

/** Combine explicit signed actions on one exact existing model, in authored
 * factor order and first-seen row order within each channel. Keep zero sums as
 * explicit authored rows. A shared uniform member must keep one intensity
 * basis; a shared point member must use exactly one station, even if zeroing
 * out. This helper does not bind IDs to geometry or generate load cases. */
export function combineElasticFrameAuthoredActions(terms:readonly ElasticFrameAuthoredActionTerm[]):ElasticFrameAuthoredActions {
  if(!dense(terms,100)||!terms.length)throw new Error("One to 100 explicit authored action terms required");
  const nodal=new Map<string,NodeSum>(),uniform=new Map<string,UniformSum>(),point=new Map<string,PointSum>();
  for(const term of terms){
    if(!plainObject(term))throw new Error("Invalid authored action term");
    const keys=["factor","loads"];
    const hasUniform=Object.hasOwn(term,"memberLoads"),hasPoint=Object.hasOwn(term,"memberPointLoads");
    if(hasUniform)keys.push("memberLoads");
    if(hasPoint)keys.push("memberPointLoads");
    if(!exact(term,keys)||!finite(term.factor)||term.factor===0||!dense(term.loads,50)||
      (hasUniform&&!dense(term.memberLoads,100))||(hasPoint&&!dense(term.memberPointLoads,100)))
      throw new Error("Exact authored action arrays and finite nonzero factor required");
    const {factor,loads,memberLoads,memberPointLoads}=term;
    if(!loads.length&&!memberLoads?.length&&!memberPointLoads?.length)
      throw new Error("An authored action term must contain at least one explicit action row");
    const nSeen=new Set<string>(),uSeen=new Set<string>(),pSeen=new Set<string>();
    for(const row of loads){
      if(!exact(row,["nodeId","fxLb","fyLb","momentLbIn"]))throw new Error("Exact nodal action fields required");
      const {nodeId,fxLb,fyLb,momentLbIn}=row;
      checkDistinct(nSeen,nodeId,"nodal");
      const prior=nodal.get(nodeId);
      nodal.set(nodeId,{nodeId,fxLb:add(prior?.fxLb,factor,fxLb),fyLb:add(prior?.fyLb,factor,fyLb),
        momentLbIn:add(prior?.momentLbIn,factor,momentLbIn)});
    }
    for(const row of memberLoads??[]){
      if(!exact(row,["memberId","basis","qxLbPerIn","qyLbPerIn"]))throw new Error("Exact uniform action fields required");
      const {memberId,basis,qxLbPerIn,qyLbPerIn}=row;
      checkDistinct(uSeen,memberId,"uniform member");
      if(basis!=="member-length"&&basis!=="horizontal-projection")throw new Error("Explicit uniform action basis required");
      const prior=uniform.get(memberId);
      if(prior&&prior.basis!==basis)throw new Error("Conflicting uniform action bases for one member");
      uniform.set(memberId,{memberId,basis,qxLbPerIn:add(prior?.qxLbPerIn,factor,qxLbPerIn),
        qyLbPerIn:add(prior?.qyLbPerIn,factor,qyLbPerIn)});
    }
    for(const row of memberPointLoads??[]){
      if(!exact(row,["memberId","stationIn","fxLb","fyLb"]))throw new Error("Exact point action fields required");
      const {memberId,stationIn,fxLb,fyLb}=row;
      checkDistinct(pSeen,memberId,"point member");
      if(!finite(stationIn)||stationIn<=0)throw new Error("Explicit positive point action station required");
      const prior=point.get(memberId);
      if(prior&&prior.stationIn!==stationIn)throw new Error("Conflicting point action stations for one member");
      point.set(memberId,{memberId,stationIn,fxLb:add(prior?.fxLb,factor,fxLb),fyLb:add(prior?.fyLb,factor,fyLb)});
    }
    if(nodal.size>50||uniform.size>100||point.size>100)throw new Error("Combined actions exceed bounded frame row counts");
  }
  return {
    loads:[...nodal.values()].map(({nodeId,fxLb,fyLb,momentLbIn})=>
      ({nodeId,fxLb:finish(fxLb),fyLb:finish(fyLb),momentLbIn:finish(momentLbIn)})),
    ...(uniform.size?{memberLoads:[...uniform.values()].map(({memberId,basis,qxLbPerIn,qyLbPerIn})=>
      ({memberId,basis,qxLbPerIn:finish(qxLbPerIn),qyLbPerIn:finish(qyLbPerIn)}))}:{}),
    ...(point.size?{memberPointLoads:[...point.values()].map(({memberId,stationIn,fxLb,fyLb})=>
      ({memberId,stationIn,fxLb:finish(fxLb),fyLb:finish(fyLb)}))}:{}),
  };
}
