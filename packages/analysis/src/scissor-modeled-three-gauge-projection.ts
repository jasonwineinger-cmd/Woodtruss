import {snapshotElasticFrameReviewData} from "./elastic-frame-reviewed-plain-data.js";

const nodeIds=["Q1","R","Q3"] as const;
type GaugeNodeId=typeof nodeIds[number];
type GaugeBinding={gaugeId:string;nodeId:GaugeNodeId};
const id=(value:unknown):value is string=>typeof value==="string"&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(value);
const isRecord=(value:unknown):value is Record<string,unknown>=>
  value!==null&&typeof value==="object"&&!Array.isArray(value);

/** Accept only three separately labeled, explicitly authored model bindings.
 * This does not infer a physical gauge position or map a measured test. */
export function bindScissorModeledThreeGauges(gauges:unknown):GaugeBinding[] {
  const data=snapshotElasticFrameReviewData(gauges);
  if(!Array.isArray(data)||data.length!==3)throw new Error("Exactly three authored modeled scissor gauge bindings required");
  const labels=new Set<string>();
  return nodeIds.map((nodeId,index)=>{
    const row:unknown=data[index];
    if(!isRecord(row)||Object.keys(row).length!==2||!Object.hasOwn(row,"gaugeId")||
        !Object.hasOwn(row,"nodeId")||row.nodeId!==nodeId||!id(row.gaugeId)||labels.has(row.gaugeId)) {
      throw new Error("Unique exact scissor gauge labels must bind the authored order Q1, R, Q3");
    }
    labels.add(row.gaugeId);
    return {gaugeId:row.gaugeId,nodeId};
  });
}

function mean3(values:readonly number[]):number {
  // Cancel opposite-signed terms before adding the third. This preserves a
  // small residual when two large opposing terms cancel. Scale only if an
  // intermediate total overflows; a three-way average itself must fit.
  const [a,b,c]=[...values].sort((left,right)=>Math.abs(right)-Math.abs(left));
  const opposite=(x:number,y:number)=>x!==0&&y!==0&&Math.sign(x)!==Math.sign(y);
  const sum=opposite(a,b)?(a+b)+c:opposite(a,c)?(a+c)+b:(b+c)+a;
  if(Number.isFinite(sum))return sum/3||0;
  const scale=Math.max(...values.map(Math.abs));
  return ((a/scale+b/scale+c/scale)/3)*scale;
}

/** Downward-positive modeled global Y translations in inches, equal weight.
 * No physical datum interpolation, measured displacement or code limit. */
export function projectScissorModeledThreeGauges(gauges:unknown,verticalDisplacementByNodeIn:unknown) {
  const bound=bindScissorModeledThreeGauges(gauges);
  const displacements=snapshotElasticFrameReviewData(verticalDisplacementByNodeIn);
  if(!isRecord(displacements)||Object.entries(displacements).some(([key,value])=>!id(key)||!Number.isFinite(value))) {
    throw new Error("Finite modeled global vertical displacement map required");
  }
  const projected=bound.map(({gaugeId,nodeId})=>{
    const uy=displacements[nodeId];
    if(!Object.hasOwn(displacements,nodeId)||typeof uy!=="number"||!Number.isFinite(uy)) {
      throw new Error(`Missing finite modeled vertical displacement for scissor gauge node ${nodeId}`);
    }
    return {gaugeId,nodeId,downwardIn:uy===0?0:-uy};
  });
  return {gauges:projected,averageDownwardIn:mean3(projected.map(row=>row.downwardIn))};
}
