import { generateDoubleFinkTopology } from "./double-fink-topology.js";
import type { RoofInput } from "./index.js";
import type { Member } from "./topology.js";

/**
 * Generic eight-panel double-Fink-style centerline reference with vertical
 * end offsets. The two new end wedges are triangulated schematically; that
 * does not establish heel details, restraints, stability or load capacity.
 */
export function generateRaisedHeelDoubleFinkTopology(input: RoofInput) {
  const heel = input.heelHeightIn;
  if (typeof heel !== "number" || !Number.isFinite(heel) || heel < 1 || heel > 48)
    throw new Error("Raised double-Fink heel requires 1–48 inches of centerline offset");
  if ((input.overhangIn ?? 0) !== 0)
    throw new Error("Raised double-Fink overhangs are not supported");
  const base = generateDoubleFinkTopology({...input,heelHeightIn:0});
  const span = input.spanFt * 12;
  const joints = base.joints.map(({id,position})=>({
    id, position:{x:position.x,y:id.startsWith("T") ? position.y+heel : position.y},
  }));
  joints.push({id:"HL",position:{x:0,y:heel}},{id:"HE",position:{x:span,y:heel}});

  const members: Member[] = base.members.map(member=>{
    if(member.kind!=="top") return member;
    const start = member.start==="L" ? "HL" : member.start;
    const end = member.end==="E" ? "HE" : member.end;
    return {...member,start,end,id:`top-${start}-${end}`};
  });
  for(const [start,end] of [["L","HL"],["HL","B1"],["B7","HE"],["HE","E"]])
    members.push({id:`web-${start}-${end}`,start,end,kind:"web"});
  return {
    ...base,
    subtype:"symmetric-raised-heel-double-fink-reference" as const,
    topHeels:{left:"HL",right:"HE"},
    joints,members,
    warnings:[...base.warnings,"Raised-heel centerlines alone establish no bearing or heel connection detail."],
  };
}
