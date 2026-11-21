import type {TrussTopology} from "../../geometry/src/topology.js";

export interface SchematicMemberLength {
 memberId:string;
 kind:"top"|"bottom"|"web";
 centerlineLengthIn:number;
 /** No saw angle, bearing cut, splice, or plate allowance has been calculated. */
 fabricationReady:false;
}
export interface SchematicLengthReport {
 status:"GEOMETRY_ONLY_NOT_ENGINEERED";
 members:SchematicMemberLength[];
 warnings:string[];
}
/** Centerline takeoff only. Must not be used as a cutting list. */
export function summarizeSchematicLengths(topology:TrussTopology):SchematicLengthReport {
 const nodes=new Map(topology.joints.map(j=>[j.id,j.position]));
 if(nodes.size!==topology.joints.length)throw new Error("Duplicate joint identifiers");
 const members=topology.members.map(m=>{
   const a=nodes.get(m.start),b=nodes.get(m.end);
   if(!a||!b)throw new Error("Missing member joint");
   const length=Math.hypot(a.x-b.x,a.y-b.y);
   if(!Number.isFinite(length)||length<=0)throw new Error("Invalid member centerline length");
   return {memberId:m.id,kind:m.kind,centerlineLengthIn:length,fabricationReady:false as const};
 });
 return {status:"GEOMETRY_ONLY_NOT_ENGINEERED",members,
   warnings:["Schematic centerline dimensions only; NOT a fabrication cut list.",
     "Actual lumber cuts depend on joints, chord splices, bearings, lumber orientation and connector plates."]};
}
