import type {TrussModel,JointLoad} from "./index.js";

/** Preliminary gravity loading using horizontal projected roof area.
 * Input psf and spacing feet; loads are applied at top-chord joints.
 * NOT a code load-combination engine or a final truss loading model.
 */
export interface UniformRoofGravityInput {
  topChordNodeIds: string[];
  roofPressurePsf: number;
  trussSpacingFt: number;
}
export function roofGravityNodalLoads(
  model: Pick<TrussModel,"nodes">,
  input: UniformRoofGravityInput
): JointLoad[] {
  const {topChordNodeIds,roofPressurePsf,trussSpacingFt}=input;
  if(!Number.isFinite(roofPressurePsf)||roofPressurePsf<0||
     !Number.isFinite(trussSpacingFt)||trussSpacingFt<=0)
    throw new Error("Invalid gravity pressure or truss spacing");
  if(topChordNodeIds.length<2||new Set(topChordNodeIds).size!==topChordNodeIds.length)
    throw new Error("Top chord node IDs must be unique and contain at least two nodes");
  const lookup=new Map(model.nodes.map(n=>[n.id,n]));
  const pts=topChordNodeIds.map(id=>{
    const n=lookup.get(id);
    if(!n||!Number.isFinite(n.x)||!Number.isFinite(n.y))throw new Error("Invalid top chord node");
    return n;
  });
  for(let i=1;i<pts.length;i++){
    if(pts[i].x<=pts[i-1].x)throw new Error("Top chord nodes must be ordered left to right");
  }
  const loads=new Map<string,number>(topChordNodeIds.map(id=>[id,0]));
  for(let i=1;i<pts.length;i++){
    const spanFt=(pts[i].x-pts[i-1].x)/12;
    const panelLoadLb=spanFt*trussSpacingFt*roofPressurePsf;
    loads.set(pts[i-1].id,loads.get(pts[i-1].id)!-panelLoadLb/2);
    loads.set(pts[i].id,loads.get(pts[i].id)!-panelLoadLb/2);
  }
  return topChordNodeIds.map(nodeId=>({nodeId,fyLb:loads.get(nodeId)!}));
}
