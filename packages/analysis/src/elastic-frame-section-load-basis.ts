type Point = { xIn: number; yIn: number };
export interface ElasticFrameSectionForceInput {
  left: Point;
  right: Point;
  /** Signed physical force components in global axes (lb). */
  fxLb: number;
  fyLb: number;
}

function exact(value:unknown,keys:readonly string[]):boolean {
  if(!value||typeof value!=="object")return false;
  const prototype=Object.getPrototypeOf(value);
  return (prototype===Object.prototype||prototype===null)&&Reflect.ownKeys(value).length===keys.length&&
    keys.every(key=>Object.prototype.propertyIsEnumerable.call(value,key));
}
const cleanZero = (value:number)=>value===0?0:value;
const range = ()=>new Error("Elastic frame section force or axis outside the usable numerical range");

function product(value:number,factor:number):number {
  const term=value*factor;
  if(!Number.isFinite(term)||(value!==0&&factor!==0&&term===0))throw range();
  return term;
}

/** Local projection of a physical global force, not an equivalent nodal load or
 * a recovered section action. The axial axis points from left to right as
 * supplied; positive transverse is its 90-degree CCW normal. Endpoint reversal
 * negates both components, but leaves physical length and projection unchanged.
 * Caller owns station, tributary measure and any force-to-intensity conversion. */
export function localizeElasticFrameSectionForce(input:ElasticFrameSectionForceInput) {
  if(!exact(input,["left","right","fxLb","fyLb"]))
    throw new Error("Exact endpoints and global force fields required for elastic frame section localization");
  const {left,right,fxLb,fyLb}=input;
  if(!exact(left,["xIn","yIn"])||!exact(right,["xIn","yIn"])||
    ![left.xIn,left.yIn,right.xIn,right.yIn,fxLb,fyLb].every(Number.isFinite))
    throw new Error("Finite exact ordered endpoints and signed global forces required");
  const dx=right.xIn-left.xIn,dy=right.yIn-left.yIn;
  const lengthIn=Math.hypot(dx,dy);
  if(!Number.isFinite(lengthIn)||lengthIn<=0)
    throw new Error("Elastic frame section endpoint distance must be finite and nonzero");

  // Normalize before computing direction (rounding of subnormal physical
  // lengths must not make the direction's basis non-unit).
  const scale=Math.max(Math.abs(dx),Math.abs(dy));
  const nx=dx/scale,ny=dy/scale,norm=Math.hypot(nx,ny);
  const c=nx/norm,s=ny/norm;
  if((dx!==0&&c===0)||(dy!==0&&s===0))throw range();
  const axialLb=product(fxLb,c)+product(fyLb,s);
  const transverseLb=product(fxLb,-s)+product(fyLb,c);
  if(!Number.isFinite(axialLb)||!Number.isFinite(transverseLb))throw range();
  return {axialLb:cleanZero(axialLb),transverseLb:cleanZero(transverseLb),lengthIn,
    horizontalProjectionIn:Math.abs(dx)};
}
