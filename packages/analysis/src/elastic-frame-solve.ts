import { elasticFrameElementGlobalStiffness } from "./elastic-frame-global-element.js";
import { elasticFrameMemberPointLoad } from "./elastic-frame-member-point-load.js";
import { createInclinedSupportAxis } from "../../geometry/src/inclined-support-axis.js";
import { elasticFrameMemberUniformLoad } from "./elastic-frame-member-load.js";
import { elasticFrameShearMemberPointLoad } from "./elastic-frame-shear-point-load.js";
import { elasticFrameShearMemberUniformLoad } from "./elastic-frame-shear-uniform-load.js";
import { condenseElasticFrameMemberLoad } from "./elastic-frame-release-load.js";
import { condenseElasticFrameShearLoad } from "./elastic-frame-shear-release.js";
import { recoverElasticFrameShearEndActions } from "./elastic-frame-shear-end-actions.js";
import { localizeElasticFrameSectionForce } from "./elastic-frame-section-load-basis.js";
import { recoverElasticFrameSectionDisplacement } from "./elastic-frame-section-displacement.js";
import { recoverElasticFrameSectionDemand } from "./elastic-frame-section-demand.js";
import { recoverElasticFrameLocalEndActions } from "./elastic-frame-local-end-actions.js";
import type {ElasticFrameElementProperties} from "./elastic-frame-element.js";

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

type ElasticFrameShear = {shearModulusPsi:number;effectiveShearAreaIn2:number};
type ElasticFrameMember = {
  id:string;startNodeId:string;endNodeId:string;areaIn2:number;secondMomentIn4:number;elasticModulusPsi:number;
  shear?:ElasticFrameShear;
} & ({releaseStartRotation?:never;releaseEndRotation?:never} |
     {releaseStartRotation:boolean;releaseEndRotation:boolean});

export interface ElasticFrameInput {
  nodes:readonly {id:string;xIn:number;yIn:number}[];
  members:readonly ElasticFrameMember[];
  supports:readonly ElasticFrameSupport[];
  loads:readonly {nodeId:string;fxLb:number;fyLb:number;momentLbIn:number}[];
  memberLoads?:readonly ElasticFrameUniformAction[];
  memberPointLoads?:readonly ElasticFramePointAction[];
  /** Requested points in each member's ordered local axis, not a deflection envelope. */
  memberDisplacementStations?:readonly {memberId:string;stationsIn:readonly number[]}[];
}
const finite=(numbers:readonly number[])=>numbers.every(Number.isFinite);
const validId=(id:string)=>typeof id==="string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(id);
const exact=(row:object,keys:readonly string[])=>!!row && typeof row==="object" && !Array.isArray(row) &&
  Reflect.ownKeys(row).length===keys.length && keys.every(key=>Object.hasOwn(row,key));

/** Separate bounded linear elastic frame study. An explicit shear-flexible
 * member supports rigid or ideally released ends and bounded member actions; other members use the
 * established Euler–Bernoulli path. No design or capacity checks. */
export function solveElasticFrame(input:ElasticFrameInput) {
  const fields=["nodes","members","supports","loads"];
  const hasMemberLoads=!!input&&Object.hasOwn(input,"memberLoads");
  const hasPointLoads=!!input&&Object.hasOwn(input,"memberPointLoads");
  const hasStations=!!input&&Object.hasOwn(input,"memberDisplacementStations");
  if(hasMemberLoads) fields.push("memberLoads");
  if(hasPointLoads) fields.push("memberPointLoads");
  if(hasStations) fields.push("memberDisplacementStations");
  if(!exact(input,fields)) throw new Error("Unknown or missing frame input field");
  const {nodes,members,supports,loads}=input;
  if (hasMemberLoads&&!Array.isArray(input.memberLoads)) throw new Error("Invalid frame member loads");
  if (hasPointLoads&&!Array.isArray(input.memberPointLoads)) throw new Error("Invalid frame member point loads");
  const memberLoads=hasMemberLoads?input.memberLoads!:[];
  const pointLoads=hasPointLoads?input.memberPointLoads!:[];
  const stationRequests=hasStations?input.memberDisplacementStations:undefined;
  if(hasStations&&(!Array.isArray(stationRequests)||!stationRequests.length||stationRequests.length>100))
    throw new Error("Invalid frame member displacement station requests");

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
  type MemberRecord={
    a:number;b:number;properties:ElasticFrameElementProperties;globalToLocal:number[][];
    originalLocalLoad:number[];physicalMemberActions:number[][];
    shear?:ElasticFrameShear;
    sectionUniform:{qxLbPerIn:number;qyLbPerIn:number}|null;
    sectionPoint:{stationIn:number;fxLb:number;fyLb:number}|null;
  };
  const memberEnds=new Map<string,MemberRecord>();
  const rotationConnected=Array<boolean>(nodes.length).fill(false);
  const memberKeys=["id","startNodeId","endNodeId","areaIn2","secondMomentIn4","elasticModulusPsi"];
  for(const m of Array.from(members)) {
    const hasShear=!!m&&Object.hasOwn(m,"shear");
    const fields=hasShear?[...memberKeys,"shear"]:memberKeys;
    const rigid=exact(m,fields);
    const explicit=exact(m,[...fields,"releaseStartRotation","releaseEndRotation"]);
    if((!rigid&&!explicit)||!validId(m.id)||memberEnds.has(m.id)||
       (explicit&&(typeof m.releaseStartRotation!=="boolean"||typeof m.releaseEndRotation!=="boolean")))
      throw new Error("Invalid or repeated frame member or end release fields");
    const a=owner.get(m.startNodeId),b=owner.get(m.endNodeId);
    if(a===undefined||b===undefined||a===b||adjacency[a].has(b)) throw new Error("Invalid or duplicate frame member incidence");
    const releaseLeftRotation=explicit&&m.releaseStartRotation===true;
    const releaseRightRotation=explicit&&m.releaseEndRotation===true;
    if((!hasShear&&m.shear!==undefined)||(hasShear&&(!m.shear||!exact(m.shear,["shearModulusPsi","effectiveShearAreaIn2"]))))
      throw new Error("Explicit shear modulus and effective shear area required");
    const properties={areaIn2:m.areaIn2,secondMomentIn4:m.secondMomentIn4,
      elasticModulusPsi:m.elasticModulusPsi,releaseLeftRotation,releaseRightRotation};
    const {matrix,globalToLocalTransform,lengthIn}=elasticFrameElementGlobalStiffness({
      left:{xIn:nodes[a].xIn,yIn:nodes[a].yIn},right:{xIn:nodes[b].xIn,yIn:nodes[b].yIn},...properties,
      ...(hasShear?{shear:m.shear!}:{}),
    });
    memberEnds.set(m.id,{a,b,properties:{...properties,lengthIn},globalToLocal:globalToLocalTransform,
      originalLocalLoad:Array<number>(6).fill(0),physicalMemberActions:[],sectionUniform:null,sectionPoint:null,
      ...(hasShear?{shear:m.shear!}:{})});
    adjacency[a].add(b); adjacency[b].add(a);
    if(!releaseLeftRotation)rotationConnected[a]=true;
    if(!releaseRightRotation)rotationConnected[b]=true;
    const g=[3*a,3*a+1,3*a+2,3*b,3*b+1,3*b+2];
    for(let i=0;i<6;i++)for(let j=0;j<6;j++) K[g[i]][g[j]]+=matrix[i][j];
  }
  const displacementStationsByMember=new Map<string,readonly number[]>();
  for(const request of Array.from(stationRequests??[])) {
    if(!exact(request,["memberId","stationsIn"])||!validId(request.memberId)||
      displacementStationsByMember.has(request.memberId))
      throw new Error("Invalid or repeated frame member displacement station request");
    const member=memberEnds.get(request.memberId);
    if(!member) throw new Error("Unknown frame member displacement station request");
    if(!Array.isArray(request.stationsIn)||!request.stationsIn.length||request.stationsIn.length>64)
      throw new Error("Invalid frame member displacement station count");
    const stations=Array.from(request.stationsIn);
    if(new Set(stations).size!==stations.length||
      stations.some(station=>!Number.isFinite(station)||station<0||station>member.properties.lengthIn))
      throw new Error("Frame member displacement stations must be unique and within the ordered member");
    displacementStationsByMember.set(request.memberId,stations);
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
    if(s.fixRotation) {
      if(!rotationConnected[i]) throw new Error("Rotational restraint has no connected member rotation");
      fixed.add(base+2);
    }
  }
  if(fixed.size<3) throw new Error("Unstable frame: insufficient restraints");
  const appliedResultants:number[][]=[];
  const loadNodes=new Set<string>();
  for(const f of Array.from(loads)) {
    if(!exact(f,["nodeId","fxLb","fyLb","momentLbIn"])||!finite([f.fxLb,f.fyLb,f.momentLbIn])||
       loadNodes.has(f.nodeId)) throw new Error("Invalid or repeated frame load node");
    const i=owner.get(f.nodeId);
    if(i===undefined)throw new Error("Unknown frame load node");
    if(f.momentLbIn!==0&&!rotationConnected[i])
      throw new Error("Applied nodal moment has no connected member rotation");
    loadNodes.add(f.nodeId);
    F[3*i]=f.fxLb; F[3*i+1]=f.fyLb; F[3*i+2]=f.momentLbIn;
    appliedResultants.push([f.fxLb,f.fyLb,f.momentLbIn+
      (nodes[i].xIn-nodes[0].xIn)*f.fyLb-(nodes[i].yIn-nodes[0].yIn)*f.fxLb]);
  }

  const directNodalLoad=F.slice();
  const memberDofs=(a:number,b:number)=>[3*a,3*a+1,3*a+2,3*b,3*b+1,3*b+2];
  const multiply=(matrix:readonly number[][],vector:readonly number[])=>
    matrix.map(row=>row.reduce((sum,value,i)=>sum+value*vector[i],0));
  const transposeMultiply=(matrix:readonly number[][],vector:readonly number[])=>matrix.map((_,j)=>
    matrix.reduce((sum,row,i)=>sum+row[j]*vector[i],0));

  function assembleMemberAction(member:MemberRecord,globalEquivalentLoad:readonly number[],
    localEquivalentLoad:readonly number[],physicalResultant:{fxLb:number;fyLb:number;momentAboutLeftLbIn:number}) {
    const {a,b,properties,globalToLocal}=member;
    let applied=globalEquivalentLoad;
    if(properties.releaseLeftRotation||properties.releaseRightRotation) {
      const condensed=member.shear
        ?condenseElasticFrameShearLoad({...properties,...member.shear,localEquivalentLoad})
        :condenseElasticFrameMemberLoad({...properties,localEquivalentLoad});
      applied=transposeMultiply(globalToLocal,condensed);
    }
    memberDofs(a,b).forEach((dof,j)=>{
      F[dof]+=applied[j];
      member.originalLocalLoad[j]+=localEquivalentLoad[j];
    });
    const {fxLb,fyLb,momentAboutLeftLbIn}=physicalResultant;
    member.physicalMemberActions.push([fxLb,fyLb,momentAboutLeftLbIn]);
    appliedResultants.push([fxLb,fyLb,momentAboutLeftLbIn+
      (nodes[a].xIn-nodes[0].xIn)*fyLb-(nodes[a].yIn-nodes[0].yIn)*fxLb]);
  }

  const loadedMembers=new Set<string>();
  for (const action of Array.from(memberLoads)) {
    if (!exact(action,["memberId","basis","qxLbPerIn","qyLbPerIn"])||!validId(action.memberId)||
      loadedMembers.has(action.memberId)) throw new Error("Invalid or repeated frame member load");
    const ends=memberEnds.get(action.memberId);
    if (!ends) throw new Error("Unknown loaded frame member");
    const {a,b}=ends;
    const left={xIn:nodes[a].xIn,yIn:nodes[a].yIn},right={xIn:nodes[b].xIn,yIn:nodes[b].yIn};
    const input={left,right,releaseLeftRotation:false as const,releaseRightRotation:false as const,
      basis:action.basis,qxLbPerIn:action.qxLbPerIn,qyLbPerIn:action.qyLbPerIn};
    const {areaIn2,secondMomentIn4,elasticModulusPsi}=ends.properties;
    const {globalEquivalentLoad,localEquivalentLoad,physicalResultant}=ends.shear
      ? elasticFrameShearMemberUniformLoad({...input,areaIn2,secondMomentIn4,elasticModulusPsi,shear:ends.shear})
      : elasticFrameMemberUniformLoad(input);
    const local=localizeElasticFrameSectionForce({left,right,fxLb:physicalResultant.fxLb,fyLb:physicalResultant.fyLb});
    if(local.lengthIn!==ends.properties.lengthIn)throw new Error("Member section load length differs from stiffness extent");
    const qxLbPerIn=local.axialLb/local.lengthIn,qyLbPerIn=local.transverseLb/local.lengthIn;
    if(!finite([qxLbPerIn,qyLbPerIn])||(local.axialLb!==0&&qxLbPerIn===0)||(local.transverseLb!==0&&qyLbPerIn===0))
      throw new Error("Member section intensity is outside the usable numerical range");
    ends.sectionUniform={qxLbPerIn,qyLbPerIn};
    loadedMembers.add(action.memberId);
    assembleMemberAction(ends,globalEquivalentLoad,localEquivalentLoad,physicalResultant);
  }
  const pointedMembers=new Set<string>();
  for (const action of Array.from(pointLoads)) {
    if (!exact(action,["memberId","stationIn","fxLb","fyLb"])||!validId(action.memberId)||
        pointedMembers.has(action.memberId)) throw new Error("Invalid or repeated frame member point load");
    const ends=memberEnds.get(action.memberId);
    if (!ends) throw new Error("Unknown point-loaded frame member");
    const {a,b}=ends;
    const left={xIn:nodes[a].xIn,yIn:nodes[a].yIn},right={xIn:nodes[b].xIn,yIn:nodes[b].yIn};
    const input={left,right,releaseLeftRotation:false as const,releaseRightRotation:false as const,
      stationIn:action.stationIn,fxLb:action.fxLb,fyLb:action.fyLb};
    const {areaIn2,secondMomentIn4,elasticModulusPsi}=ends.properties;
    const {globalEquivalentLoad,localEquivalentLoad,physicalResultant}=ends.shear
      ?elasticFrameShearMemberPointLoad({...input,areaIn2,secondMomentIn4,elasticModulusPsi,shear:ends.shear})
      :elasticFrameMemberPointLoad(input);
    const local=localizeElasticFrameSectionForce({left,right,fxLb:physicalResultant.fxLb,fyLb:physicalResultant.fyLb});
    if(local.lengthIn!==ends.properties.lengthIn)throw new Error("Member section point length differs from stiffness extent");
    ends.sectionPoint={stationIn:action.stationIn,fxLb:local.axialLb,fyLb:local.transverseLb};
    pointedMembers.add(action.memberId);
    assembleMemberAction(ends,globalEquivalentLoad,localEquivalentLoad,physicalResultant);
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

  // Ignore only rotational placeholders with zero incidence, never an
  // actual translation or connected mechanism. Require structurally exact
  // zero rows and RHS at omitted coordinates to catch assembly mismatches.
  const absent=new Set(rotationConnected.flatMap((connected,i)=>connected?[]:[3*i+2]));
  for(const i of absent) {
    if(systemF[i]!==0||systemK[i].some(value=>value!==0)||systemK.some(row=>row[i]!==0))
      throw new Error("Nonzero action or stiffness on an omitted frame rotation");
  }
  const free=Array.from({length:count},(_,i)=>i).filter(i=>!fixed.has(i)&&!absent.has(i));
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
  // Reconstruct each member from its uncondensed applied RHS. Recover its
  // private released rotations instead of transferring a shared joint rotation.
  const summedEndActions=Array<number>(count).fill(0), endActionScales=Array<number>(count).fill(0);
  const sectionEntries:(readonly [string,ReturnType<typeof recoverElasticFrameSectionDemand>])[]=[];
  const displacementEntries:(readonly [string,ReturnType<typeof recoverElasticFrameSectionDisplacement>["samples"]])[]=[];
  const memberEndActions=Object.fromEntries(Array.from(memberEnds,([memberId,record])=>{
    const {a,b,properties,globalToLocal,originalLocalLoad,physicalMemberActions,shear}=record;
    const dofs=memberDofs(a,b);
    const localDisplacements:(number|null)[]=multiply(globalToLocal,dofs.map(i=>globalQ[i]));
    if(properties.releaseLeftRotation)localDisplacements[2]=null;
    if(properties.releaseRightRotation)localDisplacements[5]=null;
    const recovery={...properties,localDisplacements,localEquivalentLoad:originalLocalLoad};
    const recovered=shear?recoverElasticFrameShearEndActions({...recovery,...shear})
      :recoverElasticFrameLocalEndActions(recovery);
    const end=transposeMultiply(globalToLocal,recovered.localEndActions);
    const dx=nodes[b].xIn-nodes[a].xIn,dy=nodes[b].yIn-nodes[a].yIn;
    const memberTerms=[[end[0],end[1],end[2]],[end[3],end[4],end[5]],
      [0,0,dx*end[4]],[0,0,-dy*end[3]],...physicalMemberActions];
    for(let j=0;j<3;j++) {
      const error=memberTerms.reduce((sum,row)=>sum+row[j],0);
      const scale=memberTerms.reduce((sum,row)=>sum+Math.abs(row[j]),0);
      if(!finite([error,scale])||Math.abs(error)>1e-7*Math.max(1,scale))
        throw new Error("Recovered member end actions fail physical force or moment balance");
    }
    dofs.forEach((dof,j)=>{
      summedEndActions[dof]+=end[j];
      endActionScales[dof]+=Math.abs(end[j]);
    });
    const section=recoverElasticFrameSectionDemand({lengthIn:properties.lengthIn,
      localEndActions:recovered.localEndActions,uniform:record.sectionUniform,point:record.sectionPoint});
    sectionEntries.push([memberId,section]);
    const stationsIn=displacementStationsByMember.get(memberId);
    if(stationsIn) {
      const {lengthIn,elasticModulusPsi,areaIn2,secondMomentIn4}=properties;
      const result=recoverElasticFrameSectionDisplacement({lengthIn,elasticModulusPsi,areaIn2,secondMomentIn4,shear:shear??null,
        localDisplacements:recovered.localDisplacements,localEndActions:recovered.localEndActions,
        uniform:record.sectionUniform,point:record.sectionPoint,stationsIn});
      displacementEntries.push([memberId,result.samples]);
    }
    return [memberId,{startNodeId:nodes[a].id,endNodeId:nodes[b].id,
      ...recovered,shearDeformationModeled:!!shear}] as const;
  }));
  // On a joint, the opposite (member-on-node) actions balance direct
  // nodal loads and actual supports. Member loads are already in recovery.
  for(let i=0;i<count;i++) {
    const difference=summedEndActions[i]-directNodalLoad[i]-globalReactions[i];
    const scale=Math.max(1,endActionScales[i],Math.abs(directNodalLoad[i]),Math.abs(globalReactions[i]));
    if(!finite([difference,scale])||Math.abs(difference)>1e-7*scale)
      throw new Error("Recovered member end actions fail assembled joint balance");
  }

  const displacements=Object.fromEntries(nodes.map((n,i)=>[n.id,{uxIn:globalQ[3*i],uyIn:globalQ[3*i+1],rotationRad:rotationConnected[i]?globalQ[3*i+2]:null}]));
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
  const memberSectionDemand=Object.fromEntries(sectionEntries);
  const memberSectionDisplacements=Object.fromEntries(displacementEntries);
  return {displacements,reactions,memberEndActions,memberSectionDemand,memberSectionDisplacements,equilibrium:{passes:true as const,
    forceXLb:errs[0],forceYLb:errs[1],momentLbIn:errs[2],originNodeId:nodes[0].id},
    status:"PRELIMINARY_NOT_ENGINEERED" as const,fabricationAuthorized:false as const,
    scope:"Linear axial/bending frame with rigid or explicitly released member ends, ideal global or inclined restraints, nodal actions and bounded full uniform or concentric interior point forces. Explicit shear-flexible members use dedicated consistent actions and ideal release condensation/recovery. Section force extrema cover only the bounded action shapes; local section displacement is sampled only at requested stations and does not establish a deflection envelope or serviceability approval. No design or capacity approval."};
}
