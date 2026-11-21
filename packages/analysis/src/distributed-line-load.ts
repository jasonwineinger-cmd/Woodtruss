import type {JointLoad,TrussModel} from "./index.js";

export interface ExplicitDistributedLineLoad {
  /** Chord joints in increasing model X; inches. */
  orderedChordNodeIds:readonly string[];
  /** Loaded interval in model X, not length along the sloped chord. */
  fromXIn:number;
  toXIn:number;
  /** Signed vertical load intensity per horizontal inch; negative is downward. */
  fromFyLbPerIn:number;
  toFyLbPerIn:number;
  provenance:string;
}

/** Reduce a user-authored linear vertical line load to statically equivalent
 * panel-end forces, using each panel's overlap with the loaded interval.
 * This does not predict local chord bending/shear or establish structural adequacy. */
export function distributeExplicitLineLoad(model:Pick<TrussModel,"nodes"|"bars">,input:ExplicitDistributedLineLoad) {
  const {orderedChordNodeIds:ids,fromXIn,toXIn,fromFyLbPerIn,toFyLbPerIn,provenance}=input;
  if(typeof provenance!=="string"||!provenance.trim())throw new Error("Line-load provenance required");
  if(ids.length<2||new Set(ids).size!==ids.length)throw new Error("Unique ordered chord node IDs required");
  const nodes=new Map(model.nodes.map(node=>[node.id,node]));
  if(nodes.size!==model.nodes.length)throw new Error("Duplicate model node");
  const x=ids.map(id=>{
    const node=nodes.get(id);
    if(!node||!Number.isFinite(node.x)||!Number.isFinite(node.y))throw new Error("Unknown or invalid chord node");
    return node.x;
  });
  if(x.slice(1).some((value,i)=>!Number.isFinite(value-x[i])||value<=x[i]))
    throw new Error("Chord nodes must advance strictly in model X");
  // Require real, unique adjacent bars; a skipped interior joint is not a
  // virtual load-transfer panel. An explicitly chosen actual bar may run either way.
  const adjacency = new Map<string,Map<string,number>>();
  for (const {a,b} of model.bars) {
    const [first,second]=a<b?[a,b]:[b,a];
    const partners=adjacency.get(first)??new Map<string,number>();
    partners.set(second,(partners.get(second)??0)+1);
    adjacency.set(first,partners);
  }
  for(let i=1;i<ids.length;i++){
    const [a,b]=[ids[i-1],ids[i]].sort();
    if(adjacency.get(a)?.get(b)!==1)
      throw new Error("Each declared chord interval requires exactly one existing bar");
  }
  const span=toXIn-fromXIn;
  if(![fromXIn,toXIn,fromFyLbPerIn,toFyLbPerIn,span].every(Number.isFinite)||
     span<=0||fromXIn<x[0]||toXIn>x[x.length-1])
    throw new Error("Invalid line-load intensity or interval outside chord extent");

  const loads=Array<number>(ids.length).fill(0);
  const intensity=(at:number)=>{
    const t=(at-fromXIn)/span;
    return fromFyLbPerIn*(1-t)+toFyLbPerIn*t;
  };
  for(let i=0;i<x.length-1;i++){
    const a=Math.max(fromXIn,x[i]),b=Math.min(toXIn,x[i+1]);
    if(b<=a)continue;
    const panelSpan=x[i+1]-x[i],ta=(a-x[i])/panelSpan,tb=(b-x[i])/panelSpan;
    const qa=intensity(a),qb=intensity(b),overlap=b-a;
    // Exact integral of intensity × each linear panel-end shape function.
    // Simpson's formula is exact for this quadratic product.
    const toRight=overlap*(qa*ta/6+((qa/2+qb/2)*(ta/2+tb/2))*(2/3)+qb*tb/6);
    const toLeft=overlap*(qa*(1-ta)/6+((qa/2+qb/2)*(1-ta/2-tb/2))*(2/3)+qb*(1-tb)/6);
    loads[i]+=toLeft;
    loads[i+1]+=toRight;
    if(!Number.isFinite(loads[i])||!Number.isFinite(loads[i+1]))
      throw new Error("Equivalent joint force overflow");
  }
  const jointLoads:JointLoad[]=ids.map((nodeId,i)=>({nodeId,fyLb:loads[i]}));
  return {jointLoads,provenance,status:"PRELIMINARY_NOT_ENGINEERED" as const,
    warnings:["Equivalent joint forces preserve vertical resultant and moment only. Chord bending and shear are not evaluated.",
      "No building-code load factors or manufacturing release are implied."]};
}
