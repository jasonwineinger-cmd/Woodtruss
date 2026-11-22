import {snapshotElasticFrameReviewData} from "./elastic-frame-reviewed-plain-data.js";

const fields=["modeledDownwardIn","observedDownwardIn","modeledBearingLb","observedBearingLb",
  "maxReactionDifferenceLb"] as const;
const finite=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value);
const clean=(value:number)=>value===0?0:value;

function readings(value:unknown,count:number,description:string):number[] {
  if(!Array.isArray(value)||value.length!==count||!value.every(finite))
    throw new Error(`Exact ${count} finite ${description} readings required`);
  return value;
}
function difference(modeled:number,observed:number):number {
  const result=modeled-observed;
  if(!Number.isFinite(result))throw new Error("Paired scissor residual exceeds the usable numeric range");
  return clean(result);
}

function mean3(values:readonly number[]):number {
  const [a,b,c]=[...values].sort((x,y)=>Math.abs(y)-Math.abs(x));
  const opposite=(x:number,y:number)=>x!==0&&y!==0&&Math.sign(x)!==Math.sign(y);
  const sum=opposite(a,b)?(a+b)+c:opposite(a,c)?(a+c)+b:(b+c)+a;
  if(Number.isFinite(sum))return clean(sum/3);
  const scale=Math.max(Math.abs(a),Math.abs(b),Math.abs(c));
  return clean(((a/scale+b/scale+c/scale)/3)*scale);
}

/** Compare specifically paired values in authored order, modeled minus
 * observed. The reaction guard limits comparison scope only; it does not
 * authenticate observations, calibrate a model, or check allowable values. */
export function compareScissorPairedReadings(input:unknown) {
  const data=snapshotElasticFrameReviewData(input);
  if(!data||typeof data!=="object"||Array.isArray(data)||Object.keys(data).length!==fields.length||
      !fields.every(key=>Object.hasOwn(data,key))) {
    throw new Error("Exact paired scissor readings and reaction difference tolerance required");
  }
  const row=data as Record<typeof fields[number],unknown>;
  const modeledGauge=readings(row.modeledDownwardIn,3,"modeled gauge");
  const observedGauge=readings(row.observedDownwardIn,3,"observed gauge");
  const modeledBearing=readings(row.modeledBearingLb,2,"modeled bearing");
  const observedBearing=readings(row.observedBearingLb,2,"observed bearing");
  const tolerance=row.maxReactionDifferenceLb;
  if(!finite(tolerance)||tolerance<0)throw new Error("Explicit nonnegative reaction difference tolerance required");

  const bearingResidualLb=modeledBearing.map((value,index)=>difference(value,observedBearing[index]));
  const totalReactionResidualLb=clean(bearingResidualLb[0]+bearingResidualLb[1]);
  if(!Number.isFinite(totalReactionResidualLb)||
      bearingResidualLb.some(value=>Math.abs(value)>tolerance)||Math.abs(totalReactionResidualLb)>tolerance) {
    throw new Error("Paired scissor reaction difference exceeds tolerance at a bearing or in total");
  }

  const gaugeResidualIn=modeledGauge.map((value,index)=>difference(value,observedGauge[index]));
  return {gaugeResidualIn,meanGaugeResidualIn:mean3(gaugeResidualIn),bearingResidualLb,totalReactionResidualLb};
}
