export interface RectangularFrameSectionBindingInput {
  actualWidthIn:number;
  actualDepthIn:number;
  memberAreaIn2:number;
  memberSecondMomentIn4:number;
}

// No physical/model tolerance. Subnormal arithmetic cannot guarantee this
// tight relative precision and is outside this preliminary binding scope.
const minimumNormal=2**-1022;
const relativeTolerance=64*Number.EPSILON;
const usable=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value)&&value>=minimumNormal;
const fields=["actualWidthIn","actualDepthIn","memberAreaIn2","memberSecondMomentIn4"] as const;
const same=(expected:number,observed:number)=>Math.abs(expected-observed)/Math.max(expected,observed)<=relativeTolerance;

/** Derive and reconcile gross prismatic rectangle A and centroidal I=b*h³/12,
 * bending about local width (depth perpendicular to the neutral axis).
 * This is arithmetic provenance only, not lumber grade, net dimensions,
 * stiffness/capacity review, equivalent-section conversion or approval. */
export function bindRectangularFrameSection(input:RectangularFrameSectionBindingInput) {
  if(!input||typeof input!=="object"||
    (Object.getPrototypeOf(input)!==Object.prototype&&Object.getPrototypeOf(input)!==null)||
    Reflect.ownKeys(input).length!==fields.length||
    fields.some(key=>!Object.prototype.propertyIsEnumerable.call(input,key)||!usable(input[key])))
    throw new Error("Explicit finite positive actual dimensions and modeled gross section properties are required");
  const {actualWidthIn:b,actualDepthIn:h,memberAreaIn2,memberSecondMomentIn4}=input;
  const areaIn2=b*h;
  if(!usable(areaIn2))throw new Error("Derived rectangular section area is outside the usable numeric range");
  // Compute via area. Try dividing by 12 before multiplying again when the
  // intermediate area-times-depth cannot remain normal and finite.
  const areaDepth=areaIn2*h,scaledDepth=h/12;
  const candidate1=usable(areaDepth)&&usable(scaledDepth)?areaDepth*scaledDepth:NaN;
  const scaledArea=areaIn2/12,scaledAreaDepth=scaledArea*h;
  const candidate2=usable(scaledArea)&&usable(scaledAreaDepth)?scaledAreaDepth*h:NaN;
  const secondMomentIn4=[candidate1,candidate2].find(usable);
  if(secondMomentIn4===undefined)
    throw new Error("Derived rectangular section second moment is outside the usable numeric range");
  if(!same(areaIn2,memberAreaIn2)||!same(secondMomentIn4,memberSecondMomentIn4))
    throw new Error("Actual rectangle does not match the modeled gross area and directional second moment");
  return {actualWidthIn:b,actualDepthIn:h,areaIn2,secondMomentIn4,memberAreaIn2,memberSecondMomentIn4,
    status:"PRELIMINARY_NOT_ENGINEERED" as const,manufacturingApproved:false as const};
}
