import type { AtticRoomTopologyInput } from "./attic-topology.js";

/**
 * Closed-form, centered rectangle clearance limits for the symmetric zero-heel
 * roof used by the attic room reference. Independent of member depth, finish,
 * bracing, or attic floor design. A numeric fit neither solves nor approves it.
 */
export function evaluateAtticClearanceLimits(input: AtticRoomTopologyInput) {
  if (input.family !== "attic") throw new Error("Attic family required");
  if ((input.heelHeightIn ?? 0) !== 0 || (input.overhangIn ?? 0) !== 0 ||
      (input.floorElevationIn ?? 0) !== 0 || input.bottomPitchRisePer12 !== undefined)
    throw new Error("Clearance limits support only zero heel, zero overhang and the reference floor line");
  const {spanFt,pitchRisePer12,roomWidthFt,requiredClearHeightFt} = input;
  const side = input.sideClearanceIn ?? 0;
  const head = input.headClearanceIn ?? 0;
  if (!Number.isFinite(spanFt) || spanFt < 8 || spanFt > 50)
    throw new Error("Attic span must be between 8 and 50 feet");
  if (!Number.isFinite(pitchRisePer12) || pitchRisePer12 <= 0 || pitchRisePer12 > 18)
    throw new Error("Attic pitch must be greater than zero and at most 18:12");
  if (![roomWidthFt,requiredClearHeightFt].every(n => Number.isFinite(n) && n > 0) ||
      ![side,head].every(n => Number.isFinite(n) && n >= 0))
    throw new Error("Attic room dimensions and margins are invalid");

  const span = spanFt * 12;
  const width = roomWidthFt * 12;
  const height = requiredClearHeightFt * 12;
  const slope = pitchRisePer12 / 12;
  const jambRun = (span-width)/2-side;
  const tieHeight = height+head;
  const heightAtJamb = jambRun*slope;
  const runForTie = tieHeight/slope;
  const maximumWidth = span-2*(side+runForTie);
  const minimumSpan = width+2*(side+runForTie);
  const heightDeficit = heightAtJamb-tieHeight;
  if (![width,height,runForTie,minimumSpan,maximumWidth,heightDeficit].every(Number.isFinite))
    throw new Error("Attic clearance quantities exceed finite numeric range");
  return {
    kind:"symmetric-attic-centerline-clearance-limits" as const,
    status:"GEOMETRY_ONLY_NOT_ENGINEERED" as const,
    units:"in" as const,
    riseIn:span/2*slope,
    fitsCenterlineEnvelope:jambRun>0 && heightDeficit>=0,
    governingConstraint:jambRun<=0 ? "side-to-eave" as const : "head-at-jamb" as const,
    requested:{roomWidthIn:width,roomHeightIn:height,sideMarginIn:side,headMarginIn:head},
    jambRunFromEaveIn:jambRun,
    maximumRoomWidthAtRequestedHeightIn:Math.max(0,maximumWidth),
    maximumRoomHeightAtRequestedWidthIn:Math.max(0,heightAtJamb-head),
    headroomSurplusIn:heightDeficit,
    minimumGeometricSpanIn:minimumSpan,
    fitsWithMaximumSupportedSpan:minimumSpan<=600,
    structuralAnalysisAvailable:false as const,
    atticFloorDesigned:false as const,
    fabricationAuthorized:false as const,
  };
}
