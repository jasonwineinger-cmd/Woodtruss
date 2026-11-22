import { generateRoofOutline, type RoofInput } from "./index.js";
import type { Joint, Member } from "./topology.js";

/**
 * Generic, symmetric eight-panel double-Fink-style reference, assembled from
 * mirrored triangular bays. This is independent schematic geometry, not a
 * supplier drawing, an engineered member layout, or a connection detail.
 */
export function generateDoubleFinkTopology(input: RoofInput) {
  if (input.family !== "common") throw new Error("Double-Fink reference requires common family geometry");
  if ((input.heelHeightIn ?? 0) !== 0 || (input.overhangIn ?? 0) !== 0)
    throw new Error("Double-Fink reference does not support heel offsets or overhangs");
  if (input.bottomPitchRisePer12 !== undefined)
    throw new Error("Double-Fink reference requires a flat bottom chord");
  const roof = generateRoofOutline(input);
  const rise = roof.topChord[1].y;
  if (!(rise / 4 > 1e-6)) throw new Error("Double-Fink reference has degenerate chord separation");
  const top = (i: number) => i === 0 ? "L" : i === 8 ? "E" : `T${i}`;
  const bottom = (i: number) => i === 0 ? "L" : i === 8 ? "E" : `B${i}`;
  const joints: Joint[] = [{id:"L",position:roof.bearingLeft},{id:"E",position:roof.bearingRight}];
  for (let i=1; i<8; i++) {
    const x = roof.spanIn * i / 8;
    joints.push({id:top(i),position:{x,y:rise * Math.min(i,8-i)/4}},
      {id:bottom(i),position:{x,y:0}});
  }
  const members: Member[] = [];
  function add(kind:Member["kind"], start:string, end:string) {
    members.push({id:`${kind}-${start}-${end}`,start,end,kind});
  }
  for (let i=0; i<8; i++) {
    add("top",top(i),top(i+1));
    add("bottom",bottom(i),bottom(i+1));
  }
  const leftWebs = [[1,1],[1,2],[2,2],[2,3],[2,4],[3,4]];
  for (const [upper,lower] of leftWebs) {
    add("web",top(upper),bottom(lower));
    add("web",top(8-upper),bottom(8-lower));
  }
  add("web",top(4),bottom(4));
  return {
    family:"common" as const,
    subtype:"symmetric-double-fink-reference" as const,
    joints,members,
    bearings:{left:"L",right:"E"},
    status:"GEOMETRY_ONLY_NOT_ENGINEERED" as const,
    pinJointAnalysisAvailable:false as const,
    fabricationAuthorized:false as const,
    warnings:["Generic double-Fink-style centerline reference only, not a supplier layout.",
      "Stiffness, loads, bearing details, web sizing, connector plates and fabrication are unverified."],
  };
}
