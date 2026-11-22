import {recoverElasticFrameSectionDemand} from "./elastic-frame-section-demand.js";
import {
  recoverElasticFrameSectionDisplacement, type ElasticFrameSectionDisplacementInput,
} from "./elastic-frame-section-displacement.js";

export type ElasticFrameDeflectionBranchInput = Omit<ElasticFrameSectionDisplacementInput,"stationsIn">;
export type ElasticFrameDeflectionBranch = {
  startStationIn:number;
  endStationIn:number;
  /** dv/dx = c₀ + c₁t + c₂t² + c₃t³, where t is branch-local on [0,1]. */
  slopeCoefficients:readonly [number,number,number,number];
};
const fields=["lengthIn","localEndActions","localDisplacements","elasticModulusPsi","areaIn2","secondMomentIn4",
  "shear","uniform","point"] as const;
const range=()=>new Error("Elastic frame slope coefficient outside the usable numeric range");
const clean=(x:number)=>x===0?0:x;

function dividedPower(value:number,h:number,power:number,divisor:number,rigidity:number) {
  if(value===0)return 0;
  const multiply=(v:number)=>{ for(let i=0;i<power;i++)v*=h; return v; };
  const candidates=[multiply(value)/divisor/rigidity,multiply(value/rigidity/divisor),multiply(value/divisor)/rigidity];
  const result=candidates.find(v=>Number.isFinite(v)&&v!==0);
  if(result===undefined)throw range();
  return result;
}

function sum(a:number,b:number) {
  const result=a+b;
  if(!Number.isFinite(result))throw range();
  return clean(result);
}

/** Uses the actual recovered rotation and validated local load path. Each
 * returned branch gives the absolute local transverse slope polynomial;
 * subtract an independently derived end-chord slope from c₀ to obtain
 * chord-relative slope. At a point load, both one-sided slopes are retained.
 * Does not find roots, interpolate fabricated extrema, or approve a design. */
export function elasticFrameDeflectionBranches(input:ElasticFrameDeflectionBranchInput):ElasticFrameDeflectionBranch[] {
  if(!input||typeof input!=="object"||Array.isArray(input)||Reflect.ownKeys(input).length!==fields.length||
     fields.some(key=>!Object.prototype.propertyIsEnumerable.call(input,key)))
    throw new Error("Unknown or missing frame deflection branch input field");
  const {lengthIn:L,localEndActions,uniform,point,elasticModulusPsi:E,secondMomentIn4:I,shear}=input;
  const cuts=point?[0,point.stationIn,L]:[0,L];
  const {samples}=recoverElasticFrameSectionDisplacement({...input,stationsIn:cuts});
  const {sections}=recoverElasticFrameSectionDemand({lengthIn:L,localEndActions,uniform,point});
  const EI=E*I,GA=shear?shear.shearModulusPsi*shear.effectiveShearAreaIn2:null;
  if(!Number.isFinite(EI)||EI<=0||(GA!==null&&(!Number.isFinite(GA)||GA<=0)))throw range();
  const q=uniform?.qyLbPerIn??0;
  return cuts.slice(0,-1).map((startStationIn,index)=>{
    const endStationIn=cuts[index+1],h=endStationIn-startStationIn;
    // At the point cut this is the post-jump shear, not the pre-jump value.
    const section=sections.find(row=>row.stationIn===startStationIn&&row.side===(index===0?"continuous":"right"));
    if(!section||!(h>0)||!Number.isFinite(h))throw range();
    const m=section.momentLbIn,v=section.shearLb;
    return {startStationIn,endStationIn,slopeCoefficients:[
      sum(samples[index].rotationRad,GA===null?0:dividedPower(v,h,0,1,GA)),
      sum(dividedPower(m,h,1,1,EI),GA===null?0:dividedPower(-q,h,1,1,GA)),
      dividedPower(-v,h,2,2,EI),
      dividedPower(q,h,3,6,EI),
    ]};
  });
}
