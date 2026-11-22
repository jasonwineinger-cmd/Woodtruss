import {snapshotElasticFrameReviewData} from "./elastic-frame-reviewed-plain-data.js";

export type ElasticFrameHorizontalRestraint={kind:"free"}|{kind:"rigid"}|{kind:"spring";stiffnessLbPerIn:number};
export type ElasticFrameHorizontalRestraintInput={
  unrestrainedUxIn:number;
  flexibilityInPerLb:number;
  restraint:ElasticFrameHorizontalRestraint;
};
const exact=(value:unknown,keys:readonly string[]):value is Record<string,unknown>=>
  !!value&&typeof value==="object"&&!Array.isArray(value)&&
  Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const finite=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value);
const positive=(value:unknown):value is number=>finite(value)&&value>0;
const clean=(n:number)=>n===0?0:n;
const range=()=>new Error("Horizontal restraint result is outside the usable numerical range");
function checkedNonzero(value:number){
  if(!finite(value)||value===0)throw range();
  return value;
}

/** Single linear horizontal restraint applied to an explicit flexibility.
 * u = u0 + f R and R = -k u. Displacement and force both use signed +X.
 * Free and rigid states are analytical limits; no material, bearing, contact
 * capacity, connection detail, or authorization is inferred. */
export function solveElasticFrameHorizontalRestraint(input:ElasticFrameHorizontalRestraintInput) {
  const data=snapshotElasticFrameReviewData(input);
  if(!exact(data,["unrestrainedUxIn","flexibilityInPerLb","restraint"]))
    throw new Error("Exact horizontal restraint input fields required");
  const {unrestrainedUxIn:u0,flexibilityInPerLb:f,restraint}=data;
  if(!finite(u0)||!positive(f))throw new Error("Finite displacement and explicitly positive flexibility required");
  if(exact(restraint,["kind"])&&restraint.kind==="free")
    return {predictedUxIn:clean(u0),restraintForceLb:0};
  if(exact(restraint,["kind"])&&restraint.kind==="rigid")
    return {predictedUxIn:0,restraintForceLb:u0===0?0:checkedNonzero(-u0/f)};
  if(!exact(restraint,["kind","stiffnessLbPerIn"])||restraint.kind!=="spring"||!positive(restraint.stiffnessLbPerIn))
    throw new Error("One exact free, rigid or positive finite spring restraint required");
  if(u0===0)return {predictedUxIn:0,restraintForceLb:0};

  const k=restraint.stiffnessLbPerIn;
  const product=k*f;
  if(!finite(product)){
    // k*f already exceeds MAX_VALUE; unity cannot affect this denominator
    // at working precision. Both factors exceed 1, so divide by the smaller
    // first to keep any representable nonzero displacement.
    return {predictedUxIn:checkedNonzero((u0/Math.min(k,f))/Math.max(k,f)),
      restraintForceLb:checkedNonzero(-u0/f)};
  }
  const denominator=1+product;
  return {predictedUxIn:checkedNonzero(u0/denominator),
    restraintForceLb:checkedNonzero(-(k/denominator)*u0)};
}
