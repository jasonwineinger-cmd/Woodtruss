export interface AxialBarObservationInput {
  studyId:string;
  datumId:string;
  lengthIn:number;
  areaIn2:number;
  longitudinalModulusPsi:number;
  /** Positive force and length change are tension and elongation. */
  observations:readonly {
    observationId:string;
    datumId:string;
    forceLb:number;
    observedLengthChangeIn:number;
    /** Absolute comparison tolerance. No instrument tolerance is inferred. */
    allowedDifferenceIn:number;
  }[];
}
const positive=(n:number)=>Number.isFinite(n)&&n>0;
const text=(s:unknown)=>typeof s==="string"&&s.trim().length>0;

/** Compare observations to independent ideal stiffness without calibrating
 * input geometry, modulus, or structural adequacy from those observations. */
export function comparePreliminaryAxialBarObservations(input:AxialBarObservationInput) {
  const {studyId,datumId,lengthIn,areaIn2,longitudinalModulusPsi,observations}=input;
  if (!text(studyId) || !text(datumId) || ![lengthIn,areaIn2,longitudinalModulusPsi].every(positive) ||
    !Array.isArray(observations) || !observations.length || observations.length>1000)
    throw new Error("Explicit section inputs, a study and datum identity, and bounded observations are required");
  const rigidityLb=areaIn2*longitudinalModulusPsi;
  const stiffnessLbPerIn=rigidityLb/lengthIn;
  if (![rigidityLb,stiffnessLbPerIn].every(positive))
    throw new Error("Ideal axial stiffness exceeds the usable numeric range");
  const seen=new Set<string>();
  const comparisons=Array.from(observations).map(row=>{
    if (!row || !text(row.observationId) || seen.has(row.observationId) ||
      ![row.forceLb,row.observedLengthChangeIn,row.allowedDifferenceIn].every(Number.isFinite) ||
      row.allowedDifferenceIn<0)
      throw new Error("Unique observation identities and explicit finite values are required");
    seen.add(row.observationId);
    const {observationId,forceLb,observedLengthChangeIn,allowedDifferenceIn}=row;
    if (row.datumId!==datumId) return {observationId,forceLb,observedLengthChangeIn,allowedDifferenceIn,
      predictedLengthChangeIn:null,differenceIn:null,comparisonStatus:"HOLD_DATUM_MISMATCH" as const};
    const predictedLengthChangeIn=forceLb/stiffnessLbPerIn;
    const differenceIn=observedLengthChangeIn-predictedLengthChangeIn;
    if (![predictedLengthChangeIn,differenceIn].every(Number.isFinite))
      throw new Error("Ideal axial comparison exceeds the usable numeric range");
    return {observationId,forceLb,observedLengthChangeIn,allowedDifferenceIn,predictedLengthChangeIn,differenceIn,
      comparisonStatus:Math.abs(differenceIn)<=allowedDifferenceIn ?
        "WITHIN_SUPPLIED_TOLERANCE" as const : "OUTSIDE_SUPPLIED_TOLERANCE" as const};
  });
  return {status:"PRELIMINARY_NOT_ENGINEERED" as const,studyId,datumId,
    section:{lengthIn,areaIn2,longitudinalModulusPsi},stiffnessLbPerIn,comparisons,
    observedDataIndependentlyVerified:false as const,approvedForStructuralUse:false as const,
    warnings:["Tolerance is supplied by the caller and is not an allowable deformation or material qualification.",
      "No inferred modulus, connection slip, instrumentation accuracy, code limits or suitability is assessed."]};
}
