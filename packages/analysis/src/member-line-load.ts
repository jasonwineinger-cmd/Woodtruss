import type { JointLoad, TrussModel } from "./index.js";

type Intensity = { fxLbPerIn:number; fyLbPerIn:number };
export interface ExplicitMemberLineLoad {
  memberId:string;
  /** Distances along the modeled bar from endpoint a, in inches. */
  fromIn:number;
  toIn:number;
  /** Signed global-axis components per inch along the bar, not plan projection. */
  from:Intensity;
  to:Intensity;
  provenance:string;
}

/** Equivalent endpoint forces for a linear planar load on a single actual bar.
 * This preserves net force and moment, not local bending/shear or deformation. */
export function distributeExplicitMemberLineLoad(model:Pick<TrussModel,"nodes"|"bars">,input:ExplicitMemberLineLoad) {
  if(typeof input.provenance!=="string"||!input.provenance.trim())
    throw new Error("Member load provenance required");
  const matches=model.bars.filter(bar=>bar.id===input.memberId);
  if(matches.length!==1)throw new Error("Member load requires one exact member ID");
  const [{a,b}]=matches;
  if(a===b||model.bars.filter(bar=>(bar.a===a&&bar.b===b)||(bar.a===b&&bar.b===a)).length!==1)
    throw new Error("Member load requires a unique physical bar");
  const endpoints=[a,b].map(id=>{
    const nodes=model.nodes.filter(node=>node.id===id);
    if(nodes.length!==1||![nodes[0].x,nodes[0].y].every(Number.isFinite))
      throw new Error("Invalid modeled member endpoint");
    return nodes[0];
  });
  const length=Math.hypot(endpoints[1].x-endpoints[0].x,endpoints[1].y-endpoints[0].y);
  const {fromIn,toIn,from,to}=input;
  const interval=toIn-fromIn;
  if(![length,fromIn,toIn,from?.fxLbPerIn,from?.fyLbPerIn,to?.fxLbPerIn,to?.fyLbPerIn].every(Number.isFinite)||
      length<=0||fromIn<0||toIn>length||interval<=0)
    throw new Error("Invalid member load interval or intensity");
  const s=fromIn/length,t=toIn/length;
  const forces=(q0:number,q1:number)=>{
    // The average of a linear line load times a linear shape function is
    // q0*(2*n0+n1)/6 + q1*(n0+2*n1)/6 for endpoint shape values n0,n1.
    const component=(n0:number,n1:number)=>interval*(q0*((2*n0+n1)/6)+q1*((n0+2*n1)/6));
    return [component(1-s,1-t),component(s,t)];
  };
  const fx=forces(from.fxLbPerIn,to.fxLbPerIn),fy=forces(from.fyLbPerIn,to.fyLbPerIn);
  if(![...fx,...fy].every(Number.isFinite))throw new Error("Member nodal force overflow");
  const jointLoads:JointLoad[]=endpoints.map(({id:nodeId},i)=>({nodeId,fxLb:fx[i],fyLb:fy[i]}));
  return {memberId:input.memberId,provenance:input.provenance,jointLoads,
    status:"PRELIMINARY_NOT_ENGINEERED" as const,
    warnings:["Endpoint force and moment equivalence only; local member bending, shear and sizing are not evaluated.",
      "No building-code load generation, structural approval or manufacturing release."]};
}
