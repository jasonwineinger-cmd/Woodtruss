import { generateRoofOutline, type RoofInput } from "./index.js";
import type { Joint, Member } from "./topology.js";

export interface MonoTrussTopology {
  family: "mono";
  joints: Joint[];
  members: Member[];
  bearings: { left: string; right: string };
  status: "GEOMETRY_ONLY_NOT_ENGINEERED";
  warnings: string[];
}

/**
 * Four-panel schematic mono-pitch centerline graph. Low heel coincides with
 * the left bearing; a vertical web ends at the high-side bearing. Raised
 * heels and cantilevers need their own supported topology, not moved nodes.
 * This graph does not establish any member, connector, or bearing capacity.
 */
export function generateMonoTopology(input: RoofInput): MonoTrussTopology {
  if (input.family !== "mono") throw new Error("Mono topology requires the mono family");
  if ((input.heelHeightIn ?? 0) !== 0) throw new Error("Raised-heel mono topology is not supported");
  if ((input.overhangIn ?? 0) !== 0) throw new Error("Mono overhang topology is not supported");
  if (input.bottomPitchRisePer12 !== undefined) throw new Error("Mono topology requires a flat bottom chord");
  const { spanIn, topChord, bearingLeft, bearingRight } = generateRoofOutline(input);
  const rise = topChord[1].y;
  if (!Number.isFinite(rise) || rise / 4 <= 0) throw new Error("Mono top chord collapses at this pitch");

  const joints: Joint[] = [{ id: "L", position: bearingLeft }];
  const members: Member[] = [];
  const add = (kind: Member["kind"], start: string, end: string) => {
    members.push({ id: `${kind}-${start}-${end}`, start, end, kind });
  };

  let previousUpper = "L";
  let previousLower = "L";
  for (let i = 1; i <= 4; i++) {
    const upper = `T${i}`;
    const lower = i === 4 ? "E" : `B${i}`;
    const x = spanIn * i / 4;
    joints.push({ id: upper, position: { x, y: rise * i / 4 } },
      { id: lower, position: i === 4 ? bearingRight : { x, y: 0 } });
    add("top", previousUpper, upper);
    add("bottom", previousLower, lower);
    add("web", upper, lower);
    // The low panel is already one triangle: its top and bottom meet at L.
    if (i > 1) add("web", previousUpper, lower);
    previousUpper = upper;
    previousLower = lower;
  }

  return {
    family: "mono",
    joints,
    members,
    bearings: { left: "L", right: "E" },
    status: "GEOMETRY_ONLY_NOT_ENGINEERED",
    warnings: ["Schematic mono-pitch centerlines only. No structural analysis or capacity verified.",
      "Member sizes, connection and heel details, bracing, and fabrication are not established."],
  };
}
