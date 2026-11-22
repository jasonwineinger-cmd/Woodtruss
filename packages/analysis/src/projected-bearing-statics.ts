/** Independent two-bearing statics for explicitly authored vertical pressure.
 * No stiffness solver or code-derived pressure is used. */
export interface SignedProjectedPressureStrip {
  id: string;
  source: string;
  fromFt: number;
  toFt: number;
  /** Signed global Y pressure on horizontal projection: down is negative. */
  fyPsf: number;
}

export function calculateProjectedBearingStatics(input: {
  spanFt: number;
  tributaryWidthFt: number;
  strips: readonly SignedProjectedPressureStrip[];
}) {
  const {spanFt, tributaryWidthFt, strips} = input;
  if (!Number.isFinite(spanFt) || spanFt < 8 || spanFt > 50 ||
      !Number.isFinite(tributaryWidthFt) || tributaryWidthFt <= 0 ||
      !Array.isArray(strips) || strips.length < 1 || strips.length > 200)
    throw new Error("Require an 8–50 ft bearing span, positive projected tributary width, and explicit strips");
  const seenIds = new Set<string>();
  const contributions = Array.from(strips).map(strip => {
    if (!strip || typeof strip.id !== "string" || !strip.id.trim() ||
        strip.id.trim() !== strip.id || seenIds.has(strip.id) ||
        typeof strip.source !== "string" || !strip.source.trim() ||
        ![strip.fromFt, strip.toFt, strip.fyPsf].every(Number.isFinite) ||
        !(0 <= strip.fromFt && strip.fromFt < strip.toFt && strip.toFt <= spanFt))
      throw new Error("Invalid, duplicate or out-of-span pressure strip");
    seenIds.add(strip.id);
    const centerFt = strip.fromFt + (strip.toFt - strip.fromFt) / 2;
    const forceYLb = strip.fyPsf * (strip.toFt - strip.fromFt) * tributaryWidthFt;
    const momentAboutLeftLbFt = forceYLb * centerFt;
    if (![forceYLb, momentAboutLeftLbFt].every(Number.isFinite))
      throw new Error("Strip force or moment exceeds the numerical range");
    const {id, source, fromFt, toFt, fyPsf} = strip;
    return {id, source, fromFt, toFt, fyPsf, centerFt, forceYLb, momentAboutLeftLbFt};
  });
  const appliedForceYLb = contributions.reduce((sum, s) => sum + s.forceYLb, 0);
  const appliedMomentAboutLeftLbFt = contributions.reduce((sum, s) => sum + s.momentAboutLeftLbFt, 0);
  const rightReactionYLb = -appliedMomentAboutLeftLbFt / spanFt;
  const leftReactionYLb = -appliedForceYLb - rightReactionYLb;
  if (![appliedForceYLb, appliedMomentAboutLeftLbFt, leftReactionYLb, rightReactionYLb].every(Number.isFinite))
    throw new Error("Combined force, moment or reaction exceeds the numerical range");
  return {
    schemaVersion:"woodtruss.projected-bearing-statics.v1" as const,
    status:"PRELIMINARY_NOT_ENGINEERED" as const,
    fabricationAuthorized:false as const,
    spanFt, tributaryWidthFt, contributions,
    appliedForceYLb, appliedMomentAboutLeftLbFt,
    leftReactionYLb, rightReactionYLb,
    scope:"Global vertical equilibrium only. Distinct authored strips can overlap. No load ownership, design loads, member forces, deflections, anchor adequacy or fabrication.",
  };
}
