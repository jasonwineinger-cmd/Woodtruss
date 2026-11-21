/** Preliminary elastic member screening only. NOT NDS design or fabrication approval. */
export interface ElasticScreenInput {
  widthIn:number; depthIn:number; elasticModulusPsi:number;
  memberLengthIn:number; effectiveLengthFactor:number; compressionLb:number;
}
export interface ElasticScreenResult {
  areaIn2:number; minorAxisMomentIn4:number; majorAxisMomentIn4:number;
  compressionStressPsi:number; eulerMinorAxisLb:number;
  slendernessMinorAxis:number; ratioToIdealEuler:number;
  status:"PRELIMINARY_NOT_ENGINEERED"; warnings:string[];
}
export function screenElasticCompression(p:ElasticScreenInput):ElasticScreenResult {
  const {widthIn:w,depthIn:d,elasticModulusPsi:e,memberLengthIn:l,effectiveLengthFactor:k,compressionLb:n}=p;
  if(![w,d,e,l,k,n].every(Number.isFinite)||w<=0||d<=0||e<=0||l<=0||k<=0||n<0)
    throw new Error("Invalid elastic screening input");
  const areaIn2=w*d, i1=w*d**3/12, i2=d*w**3/12;
  const minorAxisMomentIn4=Math.min(i1,i2),majorAxisMomentIn4=Math.max(i1,i2);
  const effectiveLength=k*l;
  const eulerMinorAxisLb=Math.PI**2*e*minorAxisMomentIn4/effectiveLength**2;
  const slendernessMinorAxis=effectiveLength/Math.sqrt(minorAxisMomentIn4/areaIn2);
  const compressionStressPsi=n/areaIn2,ratioToIdealEuler=n/eulerMinorAxisLb;
  if(![areaIn2,minorAxisMomentIn4,majorAxisMomentIn4,eulerMinorAxisLb,slendernessMinorAxis,compressionStressPsi,ratioToIdealEuler].every(Number.isFinite)||eulerMinorAxisLb<=0)
    throw new Error("Nonfinite elastic screening result");
  return {areaIn2,minorAxisMomentIn4,majorAxisMomentIn4,compressionStressPsi,eulerMinorAxisLb,slendernessMinorAxis,ratioToIdealEuler,
    status:"PRELIMINARY_NOT_ENGINEERED",warnings:[
      "Euler buckling is an idealized theoretical reference, NOT NDS allowable compression capacity.",
      "Unbraced length, eccentricity, lumber variability, duration, moisture, creep, and combined bending remain unchecked.",
      "No engineering approval or fabrication release may be inferred."
    ]};
}
