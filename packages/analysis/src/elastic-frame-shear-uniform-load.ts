import {
  elasticFrameMemberUniformLoad, type ElasticFrameMemberUniformLoadInput,
} from "./elastic-frame-member-load.js";
import {elasticFrameShearElementLocalStiffness} from "./elastic-frame-shear-element.js";

export interface ElasticFrameShearMemberUniformLoadInput extends ElasticFrameMemberUniformLoadInput {
  areaIn2:number;
  secondMomentIn4:number;
  elasticModulusPsi:number;
  shear:{shearModulusPsi:number;effectiveShearAreaIn2:number};
}

function exactFields(value:unknown,fields:readonly string[]):boolean {
  if(!value||typeof value!=="object")return false;
  const prototype=Object.getPrototypeOf(value);
  return (prototype===Object.prototype||prototype===null)&&Reflect.ownKeys(value).length===fields.length&&
    fields.every(key=>Object.prototype.propertyIsEnumerable.call(value,key));
}

/** Full-length uniform load for an unreleased prismatic Timoshenko element.
 * This equivalence is the integral of the shear-flexible element's homogeneous
 * displacement shape, not an assumption that Euler–Bernoulli interpolation is
 * generally correct for shear. For normalized station t and bending weight p,
 * right-end transverse translation shape is p(3t²−2t³)+(1−p)t.
 * Its integral on [0,1] is 1/2 for both terms. Left rotation shape divided
 * by length is p*t*(1−t)²+(1−p)*t*(1−t)/2; both integrals are 1/12.
 * Reflected translation/rotation give +1/2 and −1/12 at the other end.
 * Axial interpolation remains linear. A uniform, explicitly declared
 * horizontal-projection measure has constant Jacobian on a straight member.
 * No nonuniform/partial span, released shear ends, or approval.
 */
export function elasticFrameShearMemberUniformLoad(input:ElasticFrameShearMemberUniformLoadInput) {
  if(!exactFields(input,["left","right","releaseLeftRotation","releaseRightRotation","basis","qxLbPerIn",
    "qyLbPerIn","areaIn2","secondMomentIn4","elasticModulusPsi","shear"]))
    throw new Error("Unknown or missing shear uniform member load field");
  const {left,right,releaseLeftRotation,releaseRightRotation,basis,qxLbPerIn,qyLbPerIn,
    areaIn2,secondMomentIn4,elasticModulusPsi,shear}=input;
  if(!exactFields(shear,["shearModulusPsi","effectiveShearAreaIn2"]))
    throw new Error("Explicit shear modulus and effective shear area required for shear uniform load");
  if(releaseLeftRotation!==false||releaseRightRotation!==false)
    throw new Error("Shear uniform member load requires both end rotation releases explicitly false");
  if(!exactFields(left,["xIn","yIn"])||!exactFields(right,["xIn","yIn"]))
    throw new Error("Exact ordered endpoints required for shear uniform load");
  const {shearFlexibility}=elasticFrameShearElementLocalStiffness({
    lengthIn:Math.hypot(right.xIn-left.xIn,right.yIn-left.yIn),areaIn2,secondMomentIn4,elasticModulusPsi,
    shearModulusPsi:shear.shearModulusPsi,effectiveShearAreaIn2:shear.effectiveShearAreaIn2,
  });
  return {...elasticFrameMemberUniformLoad({left,right,releaseLeftRotation,releaseRightRotation,basis,qxLbPerIn,qyLbPerIn}),
    shearFlexibility,shearDeformationModeled:true as const};
}
