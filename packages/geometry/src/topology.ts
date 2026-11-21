import { generateRoofOutline, type RoofInput, type PointInches } from "./index.js";

export interface Joint { id: string; position: PointInches; }
export interface Member { id: string; start: string; end: string; kind: "top" | "bottom" | "web"; }
export interface TrussTopology {
  family: "common";
  joints: Joint[];
  members: Member[];
  status: "GEOMETRY_ONLY_NOT_ENGINEERED";
  warnings: string[];
}
/** Deterministic schematic Fink-like topology. No structural or connection capacity is implied. */
export function generateCommonTopology(input: RoofInput): TrussTopology {
  if (input.family !== "common") throw new Error("Only common truss topology is implemented");
  if ((input.overhangIn ?? 0) !== 0) throw new Error("Overhang topology not yet supported");
  const roof = generateRoofOutline(input);
  const span = roof.spanIn;
  const heel = input.heelHeightIn ?? 0;
  const slope = input.pitchRisePer12 / 12;
  const joints: Joint[] = [
    {id:"L",position:{x:0,y:0}},
    {id:"Q1",position:{x:span/4,y:heel+span/4*slope}},
    {id:"R",position:{x:span/2,y:heel+span/2*slope}},
    {id:"Q3",position:{x:3*span/4,y:heel+span/4*slope}},
    {id:"E",position:{x:span,y:0}},
    {id:"B1",position:{x:span/4,y:0}},
    {id:"B2",position:{x:span/2,y:0}},
    {id:"B3",position:{x:3*span/4,y:0}},
  ];
  const members: Member[] = [];
  const add = (kind: Member["kind"], pairs: [string,string][]) => {
    for (const [start,end] of pairs) members.push({id:`${kind}-${start}-${end}`,start,end,kind});
  };
  add("top",[["L","Q1"],["Q1","R"],["R","Q3"],["Q3","E"]]);
  add("bottom",[["L","B1"],["B1","B2"],["B2","B3"],["B3","E"]]);
  add("web",[["Q1","B1"],["Q1","B2"],["R","B2"],["Q3","B2"],["Q3","B3"]]);
  return {
    family:"common", joints, members, status:"GEOMETRY_ONLY_NOT_ENGINEERED",
    warnings:["Schematic only: member sizes, forces, buckling, connections, bearing, lateral restraint and code checks are not evaluated.",
      "Heel offsets and member centerline intersections require detailed connection geometry before fabrication."]
  };
}
