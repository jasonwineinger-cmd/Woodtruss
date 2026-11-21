/** Ideal stepped axial bar with consecutive segments and one signed axial
 * resultant. No distributed load, connection slip or design suitability. */
export interface AxialStep {
  segmentId:string;
  lengthIn:number;
  areaIn2:number;
  longitudinalModulusPsi:number;
}
export interface SteppedAxialDeformationInput {
  /** Tension positive, compression negative; same force through every step. */
  axialForceLb:number;
  /** Ordered from the fixed reference, with no intervening axial loads. */
  segments:readonly AxialStep[];
}
const positive=(n:number)=>Number.isFinite(n)&&n>0;

export function studyPreliminarySteppedAxialDeformation(input:SteppedAxialDeformationInput) {
  const {axialForceLb,segments}=input;
  if (!Number.isFinite(axialForceLb) || !Array.isArray(segments) || !segments.length || segments.length>1000)
    throw new Error("An explicit signed force and one to 1000 ordered segments are required");
  const ids=new Set<string>();
  let stationIn=0, displacementIn=0, flexibilityInPerLb=0;
  const steps=segments.map(segment=>{
    if (!segment || typeof segment.segmentId!=="string" || !segment.segmentId.trim() ||
      ids.has(segment.segmentId) || ![segment.lengthIn,segment.areaIn2,segment.longitudinalModulusPsi].every(positive))
      throw new Error("Segment identity, positive length, area and modulus are required");
    ids.add(segment.segmentId);
    const {segmentId,lengthIn,areaIn2,longitudinalModulusPsi}=segment;
    const rigidityLb=areaIn2*longitudinalModulusPsi;
    const stepFlexibilityInPerLb=lengthIn/rigidityLb;
    const normalStressPsi=axialForceLb/areaIn2, axialStrain=normalStressPsi/longitudinalModulusPsi;
    const lengthChangeIn=axialStrain*lengthIn;
    const endStationIn=stationIn+lengthIn, endDisplacementIn=displacementIn+lengthChangeIn;
    if (![rigidityLb,stepFlexibilityInPerLb].every(positive) || !(endStationIn>stationIn) ||
      ![normalStressPsi,axialStrain,lengthChangeIn,endStationIn,endDisplacementIn].every(Number.isFinite))
      throw new Error("Stepped axial result exceeds the usable numeric range");
    const row={segmentId,lengthIn,areaIn2,longitudinalModulusPsi,rigidityLb,
      startStationIn:stationIn,endStationIn,normalStressPsi,axialStrain,lengthChangeIn,
      startDisplacementIn:displacementIn,endDisplacementIn,flexibilityInPerLb:stepFlexibilityInPerLb};
    stationIn=endStationIn;
    displacementIn=endDisplacementIn;
    flexibilityInPerLb+=stepFlexibilityInPerLb;
    return row;
  });
  const equivalentStiffnessLbPerIn=1/flexibilityInPerLb;
  const elasticStrainEnergyLbIn=0.5*axialForceLb*displacementIn;
  if (![flexibilityInPerLb,equivalentStiffnessLbPerIn].every(positive) ||
    !Number.isFinite(elasticStrainEnergyLbIn) || elasticStrainEnergyLbIn<0)
    throw new Error("Stepped axial aggregate exceeds the usable numeric range");
  return {
    status:"PRELIMINARY_NOT_ENGINEERED" as const, axialForceLb, segments:steps,
    totalLengthIn:stationIn,totalSignedLengthChangeIn:displacementIn,flexibilityInPerLb,
    equivalentStiffnessLbPerIn,elasticStrainEnergyLbIn,approvedForStructuralUse:false as const,
    warnings:["Ideal first-order one-dimensional result with one uniform axial force through serial segments.",
      "No distributed/intermediate loads, joint slip, bending, creep, buckling, code check or suitability is evaluated."],
  };
}
