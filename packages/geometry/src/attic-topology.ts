import { generateAtticClearanceEnvelope, type AtticEnvelopeInput } from "./attic.js";
import type { Joint, Member } from "./topology.js";

export interface AtticRoomTopologyInput extends AtticEnvelopeInput {
  /** From each vertical clearance boundary to the adjacent jamb centerline. */
  sideClearanceIn?: number;
  /** Requested minimum from clearance top to horizontal tie centerline. */
  headClearanceIn?: number;
}

/**
 * An open room bay, not a stable pin-jointed system. The rectangular central
 * bay deliberately has no diagonal through it; validated room-frame joint
 * stiffness or a different load path is outside the supported scope.
 */
export function generateAtticRoomTopology(input: AtticRoomTopologyInput) {
  if ((input.heelHeightIn ?? 0) !== 0) throw new Error("Raised-heel attic topology is not supported");
  if ((input.overhangIn ?? 0) !== 0) throw new Error("Attic overhang topology is not supported");
  if ((input.floorElevationIn ?? 0) !== 0) throw new Error("Elevated attic floor topology is not supported");
  if (input.bottomPitchRisePer12 !== undefined) throw new Error("Attic room topology requires a flat lower chord");

  const clearance = generateAtticClearanceEnvelope(input);
  const side = input.sideClearanceIn ?? 0;
  const head = input.headClearanceIn ?? 0;
  if (![side, head].every(v => Number.isFinite(v) && v >= 0))
    throw new Error("Attic room margins must be finite and nonnegative");
  const [left, peak, right] = clearance.roof;
  const low = clearance.room[0].x - side;
  const high = clearance.room[1].x + side;
  const tieHeight = clearance.room[2].y + head;
  // The top corners are at the sloping chord, while the protected room is
  // wholly under the tie. Never move the jambs inward to make margins fit.
  const chordAtJamb = peak.y * (low / peak.x);
  const epsilonIn = 1e-6;
  if (!(low > epsilonIn && high < right.x - epsilonIn &&
        low < clearance.room[1].x && high - low > epsilonIn &&
        chordAtJamb > epsilonIn && peak.y - chordAtJamb > epsilonIn &&
        tieHeight <= chordAtJamb))
    throw new Error("Requested attic room margins do not fit the nondegenerate roof geometry");

  const joints: Joint[] = [
    {id:"L",position:left}, {id:"E",position:right}, {id:"R",position:peak},
    {id:"BL",position:{x:low,y:0}}, {id:"BR",position:{x:high,y:0}},
    {id:"TL",position:{x:low,y:chordAtJamb}}, {id:"TR",position:{x:high,y:chordAtJamb}},
  ];
  const members: Member[] = [];
  const add = (kind: Member["kind"], pairs: [string,string][]) => {
    for (const [start,end] of pairs) members.push({id:`${kind}-${start}-${end}`,start,end,kind});
  };
  add("top",[["L","TL"],["TL","R"],["R","TR"],["TR","E"]]);
  add("bottom",[["L","BL"],["BL","BR"],["BR","E"]]);
  add("web",[["BL","TL"],["BR","TR"],["TL","TR"]]);
  return {
    family:"attic" as const,
    status:"GEOMETRY_ONLY_NOT_ENGINEERED" as const,
    pinJointAnalysisAvailable:false as const,
    fabricationAuthorized:false as const,
    bearings:{left:"L",right:"E"},
    protectedRoomOutlineIn:clearance.room,
    clearanceMarginsIn:{side,minimumHead:head},
    jambStationsIn:[low,high],
    tieCenterlineHeightIn:chordAtJamb,
    joints,members,
    warnings:[
      "Open rectangular room bay lacks the triangulation needed for a pin-jointed solve.",
      "Centerline clearance only; member thickness, finishes, attachments and floor design are unverified.",
      "Do not use to size, cut, press, fabricate or erect trusses.",
    ],
  };
}
