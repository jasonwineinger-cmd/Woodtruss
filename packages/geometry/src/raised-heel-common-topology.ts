import { generateRoofOutline, type RoofInput } from "./index.js";
import { generateCommonTopology, type Member } from "./topology.js";

/**
 * Level-bearing, symmetric raised-heel centerline reference. The two top
 * heel joints sit directly above the end bearings and are not aliases for
 * them. Full-depth heel-region triangulation is schematic; neither end
 * connection, lumber geometry nor structural behavior is approved here.
 */
export function generateRaisedHeelCommonTopology(input: RoofInput) {
  if (input.family !== "common") throw new Error("Raised-heel reference requires common truss geometry");
  if ((input.overhangIn ?? 0) !== 0) throw new Error("Raised-heel overhangs are not supported");
  if (input.bottomPitchRisePer12 !== undefined) throw new Error("Raised-heel reference requires a flat bottom chord");
  const heel = input.heelHeightIn;
  if (typeof heel !== "number" || !Number.isFinite(heel) || heel < 1 || heel > 48)
    throw new Error("Raised-heel reference requires 1–48 inches of centerline offset");
  const outline = generateRoofOutline(input);
  const baseline = generateCommonTopology({ ...input, heelHeightIn:0 });
  const joints = baseline.joints.map(({id,position})=>({
    id, position:{ x:position.x,y:position.y===0 ? 0 : position.y+heel },
  }));
  // A collapsed slope cannot be turned into a raised-heel common roof by
  // silently mapping its interior top joints onto the bottom line.
  if (!(outline.topChord[1].y - heel > 1e-6))
    throw new Error("Raised-heel roof pitch produces a degenerate centerline profile");
  joints.push({id:"HL",position:outline.topChord[0]}, {id:"HE",position:outline.topChord[2]});

  const members: Member[] = baseline.members.map(member => {
    if (member.kind!=="top") return member;
    const start = member.start==="L" ? "HL" : member.start;
    const end = member.end==="E" ? "HE" : member.end;
    return {...member,start,end,id:`top-${start}-${end}`};
  });
  for(const [start,end] of [["L","HL"],["HL","B1"],["B3","HE"],["HE","E"]]){
    members.push({id:`web-${start}-${end}`,start,end,kind:"web"});
  }
  return {
    family:"common" as const,
    subtype:"symmetric-raised-heel-reference" as const,
    joints,members,bearings:{left:"L",right:"E"},topHeels:{left:"HL",right:"HE"},
    status:"GEOMETRY_ONLY_NOT_ENGINEERED" as const,
    pinJointAnalysisAvailable:false as const,
    fabricationAuthorized:false as const,
    warnings:["Schematic raised-heel centerlines; bearing and heel connection geometry is unverified."],
  };
}
