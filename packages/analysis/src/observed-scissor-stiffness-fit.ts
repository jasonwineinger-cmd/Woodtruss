import {snapshotElasticFrameReviewData} from "./elastic-frame-reviewed-plain-data.js";

type Observation={averageDownwardIn:number;totalBearingReactionLb:number};
const fail=(message:string)=>new Error(`Observed scissor stiffness: ${message}`);
const finite=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value);

function stableSum(values:readonly number[]) {
  let sum=0,correction=0;
  for(const value of values){
    const next=sum+value;
    correction+=Math.abs(sum)>=Math.abs(value)?(sum-next)+value:(value-next)+sum;
    sum=next;
  }
  const result=sum+correction;
  if(!Number.isFinite(result))throw fail("sum outside usable numerical range");
  return result===0?0:result;
}
function centered(values:readonly number[]){
  // Subtract a real datum first to preserve representable increments near a
  // large common origin. Opposite-sign overflow is an explicit numeric hold.
  const origin=values[0],shifted=values.map(value=>value-origin);
  if(!shifted.every(finite))throw fail("observation range is unrepresentable");
  const scale=Math.max(...shifted.map(Math.abs));
  if(scale===0)throw fail("observation levels do not identify a slope");
  const normalized=shifted.map(value=>value/scale);
  if(normalized.some((value,index)=>value===0&&shifted[index]!==0))
    throw fail("observation range loses a nonzero level");
  const center=stableSum(normalized)/values.length;
  return {origin,scale,center,values:normalized.map(value=>value-center)};
}
function positiveRescale(value:number,numerator:number,denominator:number){
  const choices=[value*(numerator/denominator),(value/denominator)*numerator,(value*numerator)/denominator];
  const result=choices.find(candidate=>finite(candidate)&&candidate>0);
  if(result===undefined)throw fail("positive slope outside usable numerical range");
  return result;
}

/** Descriptive OLS of supplied aggregate laboratory observations only.
 * No simulated material/joint calibration, zero-force assumption, source
 * authentication, capacity check or design approval. */
export function fitObservedScissorStiffness(points:readonly Observation[]) {
  const input=snapshotElasticFrameReviewData(points);
  if(!Array.isArray(input)||input.length<3||input.length>128)
    throw fail("three to 128 explicit observed load levels required");
  const xs:number[]=[],ys:number[]=[];
  for(const row of input){
    if(!row||typeof row!=="object"||Array.isArray(row)||Object.keys(row).length!==2||
        !Object.hasOwn(row,"averageDownwardIn")||!Object.hasOwn(row,"totalBearingReactionLb")||
        !finite(row.averageDownwardIn)||!finite(row.totalBearingReactionLb))
      throw fail("exact finite observed displacement and signed total bearing reaction required");
    if(ys.length&&row.totalBearingReactionLb<=ys[ys.length-1])
      throw fail("total bearing reactions must strictly increase along the supplied loading window");
    xs.push(row.averageDownwardIn);
    ys.push(row.totalBearingReactionLb);
  }
  const x=centered(xs),y=centered(ys);
  const xx=stableSum(x.values.map(value=>value*value)),yy=stableSum(y.values.map(value=>value*value));
  const xy=stableSum(x.values.map((value,index)=>value*y.values[index]));
  if(!(xx>0&&yy>0&&xy>0))throw fail("observations do not identify a positive stiffness slope");
  const slopeLbPerIn=positiveRescale(xy/xx,y.scale,x.scale);
  const interceptLb=stableSum([y.origin,-slopeLbPerIn*x.origin,y.scale*(y.center-(xy/xx)*x.center)]);
  const correlation=xy/Math.sqrt(xx)/Math.sqrt(yy);
  if(!finite(correlation)||correlation<=0||correlation>1+64*Number.EPSILON)
    throw fail("correlation outside usable numerical range");
  const rSquared=Math.min(1,correlation*correlation);
  if(rSquared===0)throw fail("coefficient of determination is unrepresentable");
  return {slopeLbPerIn,interceptLb,rSquared,sampleCount:input.length};
}
