import { evaluateAtticClearanceLimits } from "./attic-clearance-limits.js";

export interface AtticClearanceCandidate {
  id: string;
  spanFt: number;
  pitchRisePer12: number;
}

export interface AtticClearanceStudyInput {
  roomWidthFt: number;
  requiredClearHeightFt: number;
  sideClearanceIn?: number;
  headClearanceIn?: number;
  /** Optional planning limit measured UP from the ideal level eave line. */
  maximumRidgeRiseIn?: number;
  candidates: readonly AtticClearanceCandidate[];
}

/**
 * Compare supplied span/pitch options against one unchanged room and rise
 * budget. The undominated choices trade span against rise, not engineering
 * performance, installed clearance, suitability, or price.
 */
export function studyAtticClearanceCandidates(input: AtticClearanceStudyInput) {
  const { candidates,maximumRidgeRiseIn } = input;
  if (!Array.isArray(candidates) || candidates.length < 1 || candidates.length > 128)
    throw new Error("Provide 1–128 explicit attic geometry candidates");
  if (maximumRidgeRiseIn !== undefined &&
      (!Number.isFinite(maximumRidgeRiseIn) || maximumRidgeRiseIn <= 0))
    throw new Error("Ridge rise budget must be finite and positive");
  const ids = new Set<string>();
  const rows = candidates.map(candidate => {
    const { id,spanFt,pitchRisePer12 } = candidate;
    if (typeof id !== "string" || id.trim() !== id || !id || id.length>80 || ids.has(id))
      throw new Error("Attic candidate IDs must be unique, nonempty, and trimmed");
    ids.add(id);
    const limits = evaluateAtticClearanceLimits({
      family:"attic", spanFt,pitchRisePer12,
      roomWidthFt:input.roomWidthFt,requiredClearHeightFt:input.requiredClearHeightFt,
      sideClearanceIn:input.sideClearanceIn,headClearanceIn:input.headClearanceIn,
    });
    const holds: ("side-to-eave"|"head-at-jamb"|"ridge-rise-budget")[] = [];
    if (!limits.fitsCenterlineEnvelope) holds.push(limits.governingConstraint);
    if (maximumRidgeRiseIn !== undefined && limits.riseIn>maximumRidgeRiseIn)
      holds.push("ridge-rise-budget");
    return {
      id,spanIn:spanFt*12,pitchRisePer12,ridgeRiseIn:limits.riseIn,
      headroomSurplusIn:limits.headroomSurplusIn,
      jambRunFromEaveIn:limits.jambRunFromEaveIn,
      fitsPlanningGeometry:holds.length===0,holds,
    };
  });
  const feasible = rows.filter(row=>row.fitsPlanningGeometry);
  // Keep equal alternatives rather than secretly preferring input order.
  const undominated = feasible.filter(row=>!feasible.some(other=>
    other.spanIn<=row.spanIn && other.ridgeRiseIn<=row.ridgeRiseIn &&
    (other.spanIn<row.spanIn || other.ridgeRiseIn<row.ridgeRiseIn)));
  return {
    kind:"attic-span-ridge-rise-study" as const,
    status:"GEOMETRY_ONLY_NOT_ENGINEERED" as const,
    units:"in" as const,
    maximumRidgeRiseIn:maximumRidgeRiseIn ?? null,
    candidates:rows,
    undominatedCandidateIds:undominated.sort((a,b)=>
      a.spanIn-b.spanIn || a.ridgeRiseIn-b.ridgeRiseIn || (a.id<b.id ? -1 : a.id>b.id ? 1 : 0)
    ).map(row=>row.id),
    structuralAnalysisAvailable:false as const,
    atticFloorDesigned:false as const,
    fabricationAuthorized:false as const,
  };
}
