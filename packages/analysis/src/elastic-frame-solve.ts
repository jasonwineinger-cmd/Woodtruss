import { elasticFrameElementGlobalStiffness } from "./elastic-frame-global-element.js";
import { elasticFrameMemberPointLoad } from "./elastic-frame-member-point-load.js";
import { createInclinedSupportAxis } from "../../geometry/src/inclined-support-axis.js";
import { elasticFrameMemberUniformLoad } from "./elastic-frame-member-load.js";

interface ElasticFrameUniformAction {
  memberId:string;
  basis:"member-length"|"horizontal-projection";
  qxLbPerIn:number;
  qyLbPerIn:number;
}

interface ElasticFramePointAction {memberId:string;stationIn:number;fxLb:number;fyLb:number}
type ElasticFrameSupport =
  | {nodeId:string;fixX:boolean;fixY:boolean;fixRotation:boolean}
  | {nodeId:string;freeDx:number;freeDy:number;fixRotation:boolean};

export interface ElasticFrameInput {
  nodes:readonly {id:string;xIn:number;yIn:number}[];
  members:readonly {id:string;startNodeId:string;endNodeId:string;areaIn2:number;secondMomentIn4:number;elasticModulusPsi:number}[];
  supports:readonly ElasticFrameSupport[];
  loads:readonly {nodeId:string;fxLb:number;fyLb:number;momentLbIn:number}[];
  memberLoads?:readonly ElasticFrameUniformAction[];
  memberPointLoads?:readonly ElasticFramePointAction[];
}
const finite=(numbers:readonly number[])=>numbers.every(Number.isFinite);
const validId=(id:string)=>typeof id==="string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(id);
const exact=(row:object,keys:readonly string[])=>!!row && typeof row==="object" &&
  Object.keys(row).length===keys.length && keys.every(key=>Object.hasOwn(row,key));

/** Separate bounded, linear Euler–Bernoulli frame study, rigid member ends only.
 * Ideal restraints and explicit actions only; no releases, shear deformation or design checks. */
export function solveElasticFrame(input:ElasticFrameInput) {
  const fields=["nodes","members","supports","loads"];
  const hasMemberLoads=!!input&&Object.hasOwn(input,"memberLoads");
  const hasPointLoads=!!input&&Object.hasOwn(input,"memberPointLoads");
  if(hasMemberLoads) fields.push("memberLoads");
  if(hasPointLoads) fields.push("memberPointLoads");
  if(!exact(input,fields)) throw new Error("Unknown or missing frame input field");
  const {nodes,members,supports,loads}=input;
  if (hasMemberLoads&&!Array.isArray(input.memberLoads)) throw new Error("Invalid frame member loads");
  if (hasPointLoads&&!Array.isArray(input.memberPointLoads)) throw new Error("Invalid frame member point loads");
  const memberLoads=hasMemberLoads?input.memberLoads!:[];
  const pointLoads=hasPointLoads?input.memberPointLoads!:[];

  if(![nodes,members,supports,loads].every(Array.isArray)||nodes.length<2||nodes.length>50||
     !members.length||members.length>100||!supports.length||supports.length>nodes.length||
     (!loads.length&&!memberLoads.length&&!pointLoads.length)||loads.length>nodes.length||
     memberLoads.length>members.length||pointLoads.length>members.length) throw new Error("Invalid bounded frame data counts");
  const owner=new Map<string,number>();
  for (const [i,n] of Array.from(nodes).entries()) {
    if(!exact(n,["id","xIn","yIn"])||!validId(n.id)||owner.has(n.id)||!finite([n.xIn,n.yIn]))
      throw new Error("Invalid or repeated frame node");
    owner.set(n.id,i);
  }
  const xs=nodes.map(n=>n.xIn);
  if(!(Math.max(...xs)-Math.min(...xs)<=600))
    throw new Error("Frame exceeds 50-ft horizontal study extent");
  const count=3*nodes.length;
  const K=Array.from({length:count},()=>Array<number>(count).fill(0));
  const F=Array<number>(count).fill(0);
  const adjacency=Array.from({length:nodes.length},()=>new Set<number>());
  const memberEnds=new Map<string,readonly [number,number]>();
  for(const m of Array.from(members)) {
    if(!exact(m,["id","startNodeId","endNodeId","areaIn2","secondMomentIn4","elasticModulusPsi"])||
       !validId(m.id)||memberEnds.has(m.id)) throw new Error("Invalid or repeated rigid frame member");
    const a=owner.get(m.startNodeId),b=owner.get(m.endNodeId);
    if(a===undefined||b===undefined||a===b||adjacency[a].has(b)) throw new Error("Invalid or duplicate frame member incidence");
    memberEnds.set(m.id,[a,b]); adjacency[a].add(b); adjacency[b].add(a);
    const {matrix}=elasticFrameElementGlobalStiffness({left:{xIn:nodes[a].xIn,yIn:nodes[a].yIn},
      right:{xIn:nodes[b].xIn,yIn:nodes[b].yIn},areaIn2:m.areaIn2,secondMomentIn4:m.secondMomentIn4,
      elasticModulusPsi:m.elasticModulusPsi,releaseLeftRotation:false,releaseRightRotation:false});
    const g=[3*a,3*a+1,3*a+2,3*b,3*b+1,3*b+2];
    for(let i=0;i<6;i++)for(let j=0;j<6;j++) K[g[i]][g[j]]+=matrix[i][j];
  }
  if(!K.every(finite)) throw new Error("Nonfinite assembled frame stiffness");
  const visited=new Set<number>([0]),frontier=[0];
  for(let i=0;i<frontier.length;i++)for(const next of adjacency[frontier[i]])
    if(!visited.has(next)){visited.add(next);frontier.push(next);}
  if(visited.size!==nodes.length) throw new Error("Disconnected frame");
  const fixed=new Set<number>(), fixedNodes=new Set<string>();
  // Sparse columns of the system-to-global orthogonal basis Q. Only two
  // translation columns at an inclined support differ from the identity.
  type Component=readonly [globalDof:number,coefficient:number];
  const basis:Component[][]=Array.from({length:count},(_,i)=>[[i,1]]);
  const nonzero=(...terms:Component[])=>terms.filter(term=>term[1]!==0);
  let rotated=false;
  for(const s of Array.from(supports)) {
    const isCartesian=exact(s,["nodeId","fixX","fixY","fixRotation"])&&"fixX" in s;
    const isDirectional=exact(s,["nodeId","freeDx","freeDy","fixRotation"])&&"freeDx" in s;
    if((!isCartesian&&!isDirectional)||typeof s.fixRotation!=="boolean"||fixedNodes.has(s.nodeId))
      throw new Error("Invalid or repeated frame support");
    const i=owner.get(s.nodeId);
    if(i===undefined)throw new Error("Unknown frame support node");
    fixedNodes.add(s.nodeId);
    const base=3*i;
    if(isCartesian) {
      if(typeof s.fixX!=="boolean"||typeof s.fixY!=="boolean"||!(s.fixX||s.fixY||s.fixRotation))
        throw new Error("Invalid or repeated frame support");
      if(s.fixX) fixed.add(base);
      if(s.fixY) fixed.add(base+1);
    } else if(isDirectional) {
      const {freeGlobal:t,constrainedNormalGlobal:n}=createInclinedSupportAxis({kind:"direction",dx:s.freeDx,dy:s.freeDy});
      if((s.freeDx!==0&&t.x===0)||(s.freeDy!==0&&t.y===0))
        throw new Error("Frame support direction is outside the usable numerical range");
      basis[base]=nonzero([base,t.x],[base+1,t.y]);
      basis[base+1]=nonzero([base,n.x],[base+1,n.y]);
      rotated=true;
      fixed.add(base+1);
    }
    if(s.fixRotation)fixed.add(base+2);
  }
  if(fixed.size<3) throw new Error("Unstable frame: insufficient restraints");
  const appliedResultants:number[][]=[];
  const loadNodes=new Set<string>();
  for(const f of Array.from(loads)) {
    if(!exact(f,["nodeId","fxLb","fyLb","momentLbIn"])||!finite([f.fxLb,f.fyLb,f.momentLbIn])||
       loadNodes.has(f.nodeId)) throw new Error("Invalid or repeated frame load node");
    const i=owner.get(f.nodeId);
    if(i===undefined)throw new Error("Unknown frame load node");
    loadNodes.add(f.nodeId);
    F[3*i]=f.fxLb; F[3*i+1]=f.fyLb; F[3*i+2]=f.momentLbIn;
    appliedResultants.push([f.fxLb,f.fyLb,f.momentLbIn+
      (nodes[i].xIn-nodes[0].xIn)*f.fyLb-(nodes[i].yIn-nodes[0].yIn)*f.fxLb]);
  }

  function assembleMemberAction(a:number,b:number,globalEquivalentLoad:readonly number[],
    physicalResultant:{fxLb:number;fyLb:number;momentAboutLeftLbIn:number}) {
    const dofs=[3*a,3*a+1,3*a+2,3*b,3*b+1,3*b+2];
    dofs.forEach((dof,j)=>{F[dof]+=globalEquivalentLoad[j];});
    const {fxLb,fyLb,momentAboutLeftLbIn}=physicalResultant;
    appliedResultants.push([fxLb,fyLb,momentAboutLeftLbIn+
      (nodes[a].xIn-nodes[0].xIn)*fyLb-(nodes[a].yIn-nodes[0].yIn)*fxLb]);
  }

  const loadedMembers=new Set<string>();
  for (const action of Array.from(memberLoads)) {
    if (!exact(action,["memberId","basis","qxLbPerIn","qyLbPerIn"])||!validId(action.memberId)||
      loadedMembers.has(action.memberId)) throw new Error("Invalid or repeated frame member load");
    const ends=memberEnds.get(action.memberId);
    if (!ends) throw new Error("Unknown loaded frame member");
    const [a,b]=ends;
    const left={xIn:nodes[a].xIn,yIn:nodes[a].yIn},right={xIn:nodes[b].xIn,yIn:nodes[b].yIn};
    const {globalEquivalentLoad,physicalResultant}=elasticFrameMemberUniformLoad({
      left,right,releaseLeftRotation:false,releaseRightRotation:false,
      basis:action.basis,qxLbPerIn:action.qxLbPerIn,qyLbPerIn:action.qyLbPerIn,
    });
    loadedMembers.add(action.memberId);
    assembleMemberAction(a,b,globalEquivalentLoad,physicalResultant);
  }
  const pointedMembers=new Set<string>();
  for (const action of Array.from(pointLoads)) {
    if (!exact(action,["memberId","stationIn","fxLb","fyLb"])||!validId(action.memberId)||
        pointedMembers.has(action.memberId)) throw new Error("Invalid or repeated frame member point load");
    const ends=memberEnds.get(action.memberId);
    if (!ends) throw new Error("Unknown point-loaded frame member");
    const [a,b]=ends;
    const left={xIn:nodes[a].xIn,yIn:nodes[a].yIn},right={xIn:nodes[b].xIn,yIn:nodes[b].yIn};
    const {globalEquivalentLoad,physicalResultant}=elasticFrameMemberPointLoad({
      left,right,releaseLeftRotation:false,releaseRightRotation:false,
      stationIn:action.stationIn,fxLb:action.fxLb,fyLb:action.fyLb,
    });
    pointedMembers.add(action.memberId);
    assembleMemberAction(a,b,globalEquivalentLoad,physicalResultant);
  }
  if (!finite(F)) throw new Error("Nonfinite assembled frame load");

  // Solve the congruence-transformed system (Q^T K Q, Q^T F).
  // Assemble one triangle to preserve exact symmetry of the solve matrix.
  let systemK=K,systemF=F;
  if(rotated) {
    systemK=Array.from({length:count},()=>Array<number>(count).fill(0));
    for(let i=0;i<count;i++)for(let j=0;j<=i;j++) {
      let value=0;
      for(const [a,alpha] of basis[i])for(const [b,beta] of basis[j]) value+=alpha*K[a][b]*beta;
      systemK[i][j]=systemK[j][i]=value;
    }
    systemF=basis.map(column=>column.reduce((total,[a,alpha])=>total+alpha*F[a],0));
    if(!systemK.every(finite)||!finite(systemF))throw new Error("Nonfinite oriented frame system");
  }
  function toGlobal(system:readonly number[]) {
    if(!rotated)return system;
    const global=Array<number>(count).fill(0);
    basis.forEach((column,i)=>column.forEach(([j,alpha])=>{global[j]+=system[i]*alpha;}));
    return global;
  }

  const free=Array.from({length:count},(_,i)=>i).filter(i=>!fixed.has(i));
  const diagonal=free.map(i=>Math.sqrt(systemK[i][i]));
  if(diagonal.some(x=>!(x>0)||!Number.isFinite(x)))throw new Error("Unstable or unsupported frame degree of freedom");
  // Equilibrate the stiffness diagonal before the SPD solve, since rotation
  // and translation have different units. Reject tiny dimensionless pivots.
  const L=free.map(()=>Array<number>(free.length).fill(0));
  for(let i=0;i<free.length;i++)for(let j=0;j<=i;j++){
    let value=(systemK[free[i]][free[j]]/diagonal[i])/diagonal[j];
    for(let k=0;k<j;k++)value-=L[i][k]*L[j][k];
    if(!Number.isFinite(value)||(i===j&&value<=1e-12)) throw new Error("Unstable or ill-conditioned frame stiffness");
    L[i][j]=i===j?Math.sqrt(value):value/L[j][j];
  }
  const y=Array<number>(free.length).fill(0),z=Array<number>(free.length).fill(0),q=Array<number>(count).fill(0);
  for(let i=0;i<free.length;i++){
    let value=systemF[free[i]]/diagonal[i];
    for(let j=0;j<i;j++)value-=L[i][j]*y[j];
    y[i]=value/L[i][i];
  }
  for(let i=free.length-1;i>=0;i--){
    let value=y[i];
    for(let j=i+1;j<free.length;j++)value-=L[j][i]*z[j];
    z[i]=value/L[i][i]; q[free[i]]=z[i]/diagonal[i];
  }
  const globalQ=toGlobal(q);
  // Compute the free-DOF check from the original global matrix, independently
  // projecting its residual into the authored support axes.
  const globalInternal=K.map(row=>row.reduce((total,term,i)=>total+term*globalQ[i],0));
  const project=(v:readonly number[])=>!rotated?v:
    basis.map(column=>column.reduce((total,[i,alpha])=>total+alpha*v[i],0));
  const internal=project(globalInternal);
  const residual=project(globalInternal.map((f,i)=>f-F[i]));
  const dofScale=[1,1,1];
  for(let i=0;i<count;i++) {
    dofScale[i%3]=Math.max(dofScale[i%3],Math.abs(internal[i]),Math.abs(systemF[i]));
  }
  if(!finite(globalQ)||!finite(internal)||!finite(residual)||
     free.some(i=>Math.abs(residual[i])>1e-7*dofScale[i%3]))
    throw new Error("Frame solution exceeds free-DOF residual tolerance");
  const globalReactions=toGlobal(residual.map((r,i)=>fixed.has(i)?r:0));
  if(!finite(globalReactions))throw new Error("Nonfinite oriented frame reactions");
  const displacements=Object.fromEntries(nodes.map((n,i)=>[n.id,{uxIn:globalQ[3*i],uyIn:globalQ[3*i+1],rotationRad:globalQ[3*i+2]}]));
  const reactions=Object.fromEntries(nodes.map((n,i)=>[n.id,{fxLb:globalReactions[3*i],
    fyLb:globalReactions[3*i+1],momentLbIn:globalReactions[3*i+2]}]));
  // Balance original physical actions, not the equivalent nodal assembly.
  const terms=[...appliedResultants,...nodes.map(n=>{
    const x=n.xIn-nodes[0].xIn,y=n.yIn-nodes[0].yIn,r=reactions[n.id];
    return [r.fxLb,r.fyLb,r.momentLbIn+x*r.fyLb-y*r.fxLb];
  })];
  const errs=[0,1,2].map(i=>terms.reduce((sum,row)=>sum+row[i],0));
  const totals=[0,1,2].map(i=>terms.reduce((sum,row)=>sum+Math.abs(row[i]),0));
  if(!finite(errs)||!finite(totals)||errs.some((e,i)=>Math.abs(e)>1e-7*Math.max(1,totals[i])))
    throw new Error("Global frame equilibrium failed");
  return {displacements,reactions,equilibrium:{passes:true as const,
    forceXLb:errs[0],forceYLb:errs[1],momentLbIn:errs[2],originNodeId:nodes[0].id},
    status:"PRELIMINARY_NOT_ENGINEERED" as const,fabricationAuthorized:false as const,
    scope:"Linear axial/bending frame with rigid member ends, ideal global or inclined restraints, nodal actions and bounded uniform or interior member forces; no shear deformation, end releases or section-demand recovery."};
}
