/** Educational 2D pin-jointed linear-elastic truss solver.
 * NOT validated for structural design or fabrication.
 * Consistent user-supplied units: coordinates in inches, forces in pounds, E in psi, area in in^2.
 */
export interface Node2D { id: string; x: number; y: number }
export interface Bar2D { id: string; a: string; b: string; areaIn2: number; elasticModulusPsi: number }
export interface JointLoad { nodeId: string; fxLb?: number; fyLb?: number }
export interface Support { nodeId: string; fixX: boolean; fixY: boolean }
export interface TrussModel { nodes: Node2D[]; bars: Bar2D[]; loads: JointLoad[]; supports: Support[] }
export interface TrussResult {
  status: "PRELIMINARY_NOT_ENGINEERED";
  displacementIn: Record<string,{x:number;y:number}>;
  reactionLb: Record<string,{x:number;y:number}>;
  axialForceLb: Record<string,number>;
  residualForceLb: number;
}
function solveLinear(a: number[][], rhs: number[]): number[] {
  const n=rhs.length;
  const m=a.map((r,i)=>[...r,rhs[i]]);
  const scale=Math.max(1,...a.flat().map(Math.abs));
  for(let k=0;k<n;k++){
    let p=k;
    for(let i=k+1;i<n;i++) if(Math.abs(m[i][k])>Math.abs(m[p][k])) p=i;
    if(Math.abs(m[p][k])<scale*1e-12) throw new Error("Unstable or singular truss stiffness matrix");
    [m[p],m[k]]=[m[k],m[p]];
    const pivot=m[k][k];
    for(let i=k+1;i<n;i++){
      const f=m[i][k]/pivot;
      for(let j=k+1;j<=n;j++) m[i][j]-=f*m[k][j];
      m[i][k]=0;
    }
  }
  const x=Array<number>(n).fill(0);
  for(let i=n-1;i>=0;i--){
    let sum=m[i][n];
    for(let j=i+1;j<n;j++) sum-=m[i][j]*x[j];
    x[i]=sum/m[i][i];
  }
  return x;
}
export function analyzePinJointedTruss(model: TrussModel): TrussResult {
  const {nodes,bars,loads,supports}=model;
  if(nodes.length<2 || bars.length<1) throw new Error("Truss must contain nodes and members");
  const ids=new Map<string,number>();
  nodes.forEach((n,i)=>{
    if(!n.id || ids.has(n.id) || !Number.isFinite(n.x) || !Number.isFinite(n.y)) throw new Error("Invalid or duplicate node");
    ids.set(n.id,i);
  });
  const index=(id:string):number=>{const i=ids.get(id);if(i===undefined)throw new Error("Unknown node "+id);return i;};
  const nd=nodes.length*2;
  const k=Array.from({length:nd},()=>Array<number>(nd).fill(0));
  const f=Array<number>(nd).fill(0);
  const memberData:{id:string;ia:number;ib:number;c:number;s:number;length:number;ea:number}[]=[];
  const memberIds=new Set<string>();
  for(const b of bars){
    if(!b.id || memberIds.has(b.id) || !Number.isFinite(b.areaIn2) || !Number.isFinite(b.elasticModulusPsi) || b.areaIn2<=0 || b.elasticModulusPsi<=0) throw new Error("Invalid member");
    memberIds.add(b.id);
    const ia=index(b.a),ib=index(b.b);
    const dx=nodes[ib].x-nodes[ia].x,dy=nodes[ib].y-nodes[ia].y;
    const length=Math.hypot(dx,dy);
    if(length<1e-9)throw new Error("Zero-length member");
    const c=dx/length,s=dy/length,ea=b.areaIn2*b.elasticModulusPsi;
    const v=[-c,-s,c,s],d=[2*ia,2*ia+1,2*ib,2*ib+1],factor=ea/length;
    for(let i=0;i<4;i++)for(let j=0;j<4;j++)k[d[i]][d[j]]+=factor*v[i]*v[j];
    memberData.push({id:b.id,ia,ib,c,s,length,ea});
  }
  for(const l of loads){
    const i=index(l.nodeId),fx=l.fxLb??0,fy=l.fyLb??0;
    if(!Number.isFinite(fx)||!Number.isFinite(fy))throw new Error("Nonfinite load");
    f[2*i]+=fx;f[2*i+1]+=fy;
  }
  const fixed=new Set<number>();
  for(const s of supports){
    const i=index(s.nodeId);
    if(s.fixX)fixed.add(2*i);
    if(s.fixY)fixed.add(2*i+1);
  }
  const free=Array.from({length:nd},(_,i)=>i).filter(i=>!fixed.has(i));
  if(!fixed.size || !free.length)throw new Error("Invalid boundary conditions");
  const u=Array<number>(nd).fill(0);
  const reduced=free.map(i=>free.map(j=>k[i][j]));
  const uf=solveLinear(reduced,free.map(i=>f[i]));
  free.forEach((d,i)=>u[d]=uf[i]);
  const residual=k.map((row,i)=>row.reduce((sum,kij,j)=>sum+kij*u[j],0)-f[i]);
  const displacementIn:TrussResult["displacementIn"]={};
  const reactionLb:TrussResult["reactionLb"]={};
  nodes.forEach((n,i)=>{
    displacementIn[n.id]={x:u[2*i],y:u[2*i+1]};
    reactionLb[n.id]={x:fixed.has(2*i)?residual[2*i]:0,y:fixed.has(2*i+1)?residual[2*i+1]:0};
  });
  const axialForceLb:Record<string,number>={};
  for(const m of memberData){
    const extension=m.c*(u[2*m.ib]-u[2*m.ia])+m.s*(u[2*m.ib+1]-u[2*m.ia+1]);
    axialForceLb[m.id]=m.ea/m.length*extension;
  }
  return {status:"PRELIMINARY_NOT_ENGINEERED",displacementIn,reactionLb,axialForceLb,
    residualForceLb:Math.max(...free.map(i=>Math.abs(residual[i])),0)};
}
