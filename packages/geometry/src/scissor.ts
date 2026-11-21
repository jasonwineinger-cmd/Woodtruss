import {generateRoofOutline,type RoofInput} from "./index.js";
import type {Joint,Member} from "./topology.js";

/** Parametric scissor-truss centerline schematic.
 * This topology is not engineered, checked for stability, or suitable for fabrication.
 */
export interface ScissorTopology {
 family:"scissor";
 joints:Joint[];
 members:Member[];
 status:"GEOMETRY_ONLY_NOT_ENGINEERED";
 warnings:string[];
}
export function generateScissorTopology(input:RoofInput):ScissorTopology {
 if(input.family!=="scissor")throw new Error("Scissor topology requires scissor family");
 const outline=generateRoofOutline(input);
 const span=outline.spanIn;
 const topSlope=input.pitchRisePer12/12;
 const bottomSlope=input.bottomPitchRisePer12!/12;
 const top=(x:number)=>topSlope*Math.min(x,span-x);
 const bottom=(x:number)=>bottomSlope*Math.min(x,span-x);
 const joints:Joint[]=[
  {id:"L",position:{x:0,y:0}},
  {id:"Q1",position:{x:span/4,y:top(span/4)}},
  {id:"R",position:{x:span/2,y:top(span/2)}},
  {id:"Q3",position:{x:3*span/4,y:top(3*span/4)}},
  {id:"E",position:{x:span,y:0}},
  {id:"B1",position:{x:span/4,y:bottom(span/4)}},
  {id:"B2",position:{x:span/2,y:bottom(span/2)}},
  {id:"B3",position:{x:3*span/4,y:bottom(3*span/4)}}
 ];
 const members:Member[]=[];
 const add=(kind:Member["kind"],pairs:[string,string][])=>{
  for(const [start,end] of pairs)members.push({id:`${kind}-${start}-${end}`,start,end,kind});
 };
 add("top",[["L","Q1"],["Q1","R"],["R","Q3"],["Q3","E"]]);
 add("bottom",[["L","B1"],["B1","B2"],["B2","B3"],["B3","E"]]);
 add("web",[["Q1","B1"],["Q1","B2"],["R","B2"],["Q3","B2"],["Q3","B3"]]);
 return {family:"scissor",joints,members,status:"GEOMETRY_ONLY_NOT_ENGINEERED",
  warnings:["Schematic scissor centerlines only; member stability, connections and structural forces are not verified.",
   "No fabrication dimensions, lumber selection, lateral bracing or connector plate approvals."]};
}
