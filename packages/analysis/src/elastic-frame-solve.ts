import { elasticFrameElementGlobalStiffness } from "./elastic-frame-global-element.js";

export interface ElasticFrameInput {
  nodes:readonly {id:string;xIn:number;yIn:number}[];
  members:readonly {id:string;startNodeId:string;endNodeId:string;areaIn2:number;secondMomentIn4:number;elasticModulusPsi:number}[];
  supports:readonly {nodeId:string;fixX:boolean;fixY:boolean;fixRotation:boolean}[];
  loads:readonly {nodeId:string;fxLb:number;fyLb:number;momentLbIn:number}[];
}
const finite=(numbers:readonly number[])=>numbers.every(Number.isFinite);
const validId=(id:string)=>typeof id==="string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(id);
const exact=(row:object,keys:readonly string[])=>!!row && typeof row==="object" &&
  Object.keys(row).length===keys.length && keys.every(key=>Object.hasOwn(row,key));

/** Separate bounded, linear Euler–Bernoulli frame study, rigid member ends only.
 * No member loading/release, shear, advanced support direction or design check. */
export function solveElasticFrame(input:ElasticFrameInput) {
  if(!exact(input,["nodes","members","supports","loads"])) throw new Error("Unknown or missing frame input field");
  const {nodes,members,supports,loads}=input;
  if(![nodes,members,supports,loads].every(Array.isArray)||nodes.length<2||nodes.length>50||
     !members.length||members.length>100||!supports.length||supports.length>nodes.length||
     !loads.length||loads.length>nodes.length) throw new Error("Invalid bounded frame data counts");
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
  const memberIds=new Set<string>();
  for(const m of Array.from(members)) {
    if(!exact(m,["id","startNodeId","endNodeId","areaIn2","secondMomentIn4","elasticModulusPsi"])||
       !validId(m.id)||memberIds.has(m.id)) throw new Error("Invalid or repeated rigid frame member");
    const a=owner.get(m.startNodeId),b=owner.get(m.endNodeId);
    if(a===undefined||b===undefined||a===b||adjacency[a].has(b)) throw new Error("Invalid or duplicate frame member incidence");
    memberIds.add(m.id); adjacency[a].add(b); adjacency[b].add(a);
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
  for(const s of Array.from(supports)) {
    if(!exact(s,["nodeId","fixX","fixY","fixRotation"])||
       [s.fixX,s.fixY,s.fixRotation].some(v=>typeof v!=="boolean")||
       !(s.fixX||s.fixY||s.fixRotation)||fixedNodes.has(s.nodeId)) throw new Error("Invalid or repeated frame support");
    const i=owner.get(s.nodeId);
    if(i===undefined)throw new Error("Unknown frame support node");
    fixedNodes.add(s.nodeId);
    [s.fixX,s.fixY,s.fixRotation].forEach((yes,j)=>{if(yes)fixed.add(3*i+j);});
  }
  if(fixed.size<3) throw new Error("Unstable frame: insufficient restraints");
  const loadNodes=new Set<string>();
  for(const f of Array.from(loads)) {
    if(!exact(f,["nodeId","fxLb","fyLb","momentLbIn"])||!finite([f.fxLb,f.fyLb,f.momentLbIn])||
       loadNodes.has(f.nodeId)) throw new Error("Invalid or repeated frame load node");
    const i=owner.get(f.nodeId);
    if(i===undefined)throw new Error("Unknown frame load node");
    loadNodes.add(f.nodeId);
    F[3*i]=f.fxLb; F[3*i+1]=f.fyLb; F[3*i+2]=f.momentLbIn;
  }

  const free=Array.from({length:count},(_,i)=>i).filter(i=>!fixed.has(i));
  const diagonal=free.map(i=>Math.sqrt(K[i][i]));
  if(diagonal.some(x=>!(x>0)||!Number.isFinite(x)))throw new Error("Unstable or unsupported frame degree of freedom");
  // Equilibrate the stiffness diagonal before the SPD solve, since rotation
  // and translation have different units. Reject tiny dimensionless pivots.
  const L=free.map(()=>Array<number>(free.length).fill(0));
  for(let i=0;i<free.length;i++)for(let j=0;j<=i;j++){
    let value=(K[free[i]][free[j]]/diagonal[i])/diagonal[j];
    for(let k=0;k<j;k++)value-=L[i][k]*L[j][k];
    if(!Number.isFinite(value)||(i===j&&value<=1e-12)) throw new Error("Unstable or ill-conditioned frame stiffness");
    L[i][j]=i===j?Math.sqrt(value):value/L[j][j];
  }
  const y=Array<number>(free.length).fill(0),z=Array<number>(free.length).fill(0),q=Array<number>(count).fill(0);
  for(let i=0;i<free.length;i++){
    let value=F[free[i]]/diagonal[i];
    for(let j=0;j<i;j++)value-=L[i][j]*y[j];
    y[i]=value/L[i][i];
  }
  for(let i=free.length-1;i>=0;i--){
    let value=y[i];
    for(let j=i+1;j<free.length;j++)value-=L[j][i]*z[j];
    z[i]=value/L[i][i]; q[free[i]]=z[i]/diagonal[i];
  }
  const internal=K.map(row=>row.reduce((total,term,i)=>total+term*q[i],0));
  const residual=internal.map((f,i)=>f-F[i]);
  const dofScale=[1,1,1];
  for(let i=0;i<count;i++) dofScale[i%3]=Math.max(dofScale[i%3],Math.abs(internal[i]),Math.abs(F[i]));
  if(!finite(q)||!finite(residual)||free.some(i=>Math.abs(residual[i])>1e-7*dofScale[i%3]))
    throw new Error("Frame solution exceeds free-DOF residual tolerance");
  const displacements=Object.fromEntries(nodes.map((n,i)=>[n.id,{uxIn:q[3*i],uyIn:q[3*i+1],rotationRad:q[3*i+2]}]));
  const reactions=Object.fromEntries(nodes.map((n,i)=>[n.id,{fxLb:fixed.has(3*i)?residual[3*i]:0,
    fyLb:fixed.has(3*i+1)?residual[3*i+1]:0,momentLbIn:fixed.has(3*i+2)?residual[3*i+2]:0}]));
  const terms=nodes.flatMap((n,i)=>{
    const x=n.xIn-nodes[0].xIn,y=n.yIn-nodes[0].yIn,r=reactions[n.id];
    return [[F[3*i],F[3*i+1],F[3*i+2]+x*F[3*i+1]-y*F[3*i]],
      [r.fxLb,r.fyLb,r.momentLbIn+x*r.fyLb-y*r.fxLb]];
  });
  const errs=[0,1,2].map(i=>terms.reduce((sum,row)=>sum+row[i],0));
  const totals=[0,1,2].map(i=>terms.reduce((sum,row)=>sum+Math.abs(row[i]),0));
  if(!finite(errs)||!finite(totals)||errs.some((e,i)=>Math.abs(e)>1e-7*Math.max(1,totals[i])))
    throw new Error("Global frame equilibrium failed");
  return {displacements,reactions,equilibrium:{passes:true as const,
    forceXLb:errs[0],forceYLb:errs[1],momentLbIn:errs[2],originNodeId:nodes[0].id},
    status:"PRELIMINARY_NOT_ENGINEERED" as const,fabricationAuthorized:false as const,
    scope:"Linear axial/bending frame with rigid end rotations and explicit global DOF restraints; no shear deformation, member loads or end releases."};
}
