type Point = { xIn: number; yIn: number };

export interface ElasticFrameMemberUniformLoadInput {
  left: Point;
  right: Point;
  releaseLeftRotation: false;
  releaseRightRotation: false;
  basis: "member-length" | "horizontal-projection";
  /** Signed uniform global components per inch of the explicit basis. */
  qxLbPerIn: number;
  qyLbPerIn: number;
}

function finiteProduct(left: number, right: number) {
  const result = left * right;
  if (!Number.isFinite(result) || (result === 0 && left !== 0 && right !== 0)) {
    throw new Error("Uniform member load is outside the usable numerical range");
  }
  return result === 0 ? 0 : result;
}

function exactFields(value:object, keys:readonly string[]) {
  return !!value && typeof value==="object" && Object.keys(value).length===keys.length &&
    keys.every(key=>Object.hasOwn(value,key));
}

const cleanZero = (value: number) => value === 0 ? 0 : value;

/** Consistent load of an unreleased planar prismatic Euler–Bernoulli member.
 * Ends are ordered as authored; global DOFs are [x,y,CCW rotation] at each end.
 * Output is the applied equivalent RHS load, not the opposite fixed-end actions.
 * No assumed releases, partial spans, follower forces, or design checks. */
export function elasticFrameMemberUniformLoad(input: ElasticFrameMemberUniformLoadInput) {
  if (!exactFields(input,["left","right","releaseLeftRotation","releaseRightRotation","basis","qxLbPerIn","qyLbPerIn"])) {
    throw new Error("Unknown or missing uniform member load field");
  }
  const { left, right, releaseLeftRotation, releaseRightRotation, basis, qxLbPerIn, qyLbPerIn } = input;
  if (releaseLeftRotation !== false || releaseRightRotation !== false) {
    throw new Error("Explicit unreleased end rotations are required for uniform member-load equivalence");
  }
  if (basis !== "member-length" && basis !== "horizontal-projection") throw new Error("Explicit supported line-load basis required");
  if (!exactFields(left,["xIn","yIn"]) || !exactFields(right,["xIn","yIn"]) ||
      ![left.xIn, left.yIn, right.xIn, right.yIn, qxLbPerIn, qyLbPerIn].every(Number.isFinite)) {
    throw new Error("Finite ordered endpoints and signed global intensities required");
  }
  const dx = right.xIn - left.xIn;
  const dy = right.yIn - left.yIn;
  const lengthIn = Math.hypot(dx, dy);
  if (!Number.isFinite(lengthIn) || lengthIn <= 0) throw new Error("Finite nonzero member length required");
  if (lengthIn/12 === 0 || (dx!==0 && dx/2===0) || (dy!==0 && dy/2===0)) {
    throw new Error("Member coordinates are outside the usable numerical range");
  }
  const horizontalProjectionIn = Math.abs(dx);
  const loadedMeasureIn = basis === "member-length" ? lengthIn : horizontalProjectionIn;
  if (loadedMeasureIn <= 0) throw new Error("Horizontal-projection loading requires a nonzero projection");

  const scale = Math.max(Math.abs(dx), Math.abs(dy));
  const nx = dx / scale, ny = dy / scale;
  if ((nx === 0 && dx !== 0) || (ny === 0 && dy !== 0))
    throw new Error("Member axis is outside the usable numerical range");
  const norm = Math.hypot(nx, ny);
  const c = nx / norm, s = ny / norm;
  const fxLb = finiteProduct(qxLbPerIn, loadedMeasureIn);
  const fyLb = finiteProduct(qyLbPerIn, loadedMeasureIn);
  const localAxialTotalLb = finiteProduct(c, fxLb) + finiteProduct(s, fyLb);
  const localTransverseTotalLb = finiteProduct(-s, fxLb) + finiteProduct(c, fyLb);
  // Integrated Hermite rotational shape functions give ±q_local L²/12.
  const momentLbIn = finiteProduct(localTransverseTotalLb, lengthIn / 12);
  const axialAtEachEnd = finiteProduct(localAxialTotalLb, 0.5);
  const transverseAtEachEnd = finiteProduct(localTransverseTotalLb, 0.5);
  // Local translation forces are identical at both ends. Tᵀ therefore
  // returns half the original global resultant at each end exactly.
  const fxAtEachEnd = finiteProduct(fxLb, 0.5);
  const fyAtEachEnd = finiteProduct(fyLb, 0.5);
  const localEquivalentLoad = [axialAtEachEnd, transverseAtEachEnd, momentLbIn,
    axialAtEachEnd, transverseAtEachEnd, cleanZero(-momentLbIn)] as const;
  const globalEquivalentLoad = [fxAtEachEnd, fyAtEachEnd, momentLbIn,
    fxAtEachEnd, fyAtEachEnd, cleanZero(-momentLbIn)] as const;

  // Independent physical statics of q times the declared measure, applied
  // at the actual geometric midpoint. Lever arms are relative to the left end.
  const midpoint = { xIn: left.xIn + dx / 2, yIn: left.yIn + dy / 2 };
  const momentAboutLeftLbIn = cleanZero(finiteProduct(dx / 2, fyLb) - finiteProduct(dy / 2, fxLb));
  if (![midpoint.xIn, midpoint.yIn, momentAboutLeftLbIn].every(Number.isFinite)) {
    throw new Error("Physical load resultant is outside the usable numerical range");
  }
  return {
    basis, qxLbPerIn, qyLbPerIn, lengthIn, horizontalProjectionIn, loadedMeasureIn,
    globalDofOrder: ["xLeft", "yLeft", "thetaLeft", "xRight", "yRight", "thetaRight"] as const,
    localEquivalentLoad, globalEquivalentLoad,
    physicalResultant: { fxLb, fyLb, midpoint, momentAboutLeftLbIn },
    status: "PRELIMINARY_NOT_ENGINEERED" as const,
    manufacturingApproved: false as const,
  };
}
