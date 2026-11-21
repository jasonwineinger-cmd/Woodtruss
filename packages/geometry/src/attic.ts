import type {RoofInput,PointInches} from "./index.js";

/** Attic clearance envelope for early space planning only.
 * Does not define a load-bearing attic truss, floor system, webs, or fabrication geometry.
 */
export interface AtticEnvelopeInput extends RoofInput {
 family:"attic";
 roomWidthFt:number;
 requiredClearHeightFt:number;
 floorElevationIn?:number;
}
export interface AtticEnvelope {
 family:"attic";
 roof:PointInches[];
 room:PointInches[];
 roomWidthIn:number;
 requiredClearHeightIn:number;
 availableClearHeightIn:number;
 status:"GEOMETRY_ONLY_NOT_ENGINEERED";
 warnings:string[];
}
export function generateAtticClearanceEnvelope(input:AtticEnvelopeInput):AtticEnvelope {
 if(input.family!=="attic")throw new Error("Attic family required");
 const {spanFt,pitchRisePer12,roomWidthFt,requiredClearHeightFt}=input;
 const heel=input.heelHeightIn??0,overhang=input.overhangIn??0;
 const floor=input.floorElevationIn??0;
 if(![spanFt,pitchRisePer12,roomWidthFt,requiredClearHeightFt,heel,overhang,floor].every(Number.isFinite))
   throw new Error("Nonfinite attic geometry input");
 if(spanFt<8||spanFt>50||pitchRisePer12<=0||pitchRisePer12>18||
    roomWidthFt<=0||roomWidthFt>=spanFt||requiredClearHeightFt<=0||
    floor<0||heel<0||heel>48||overhang!==0)
   throw new Error("Invalid or unsupported attic geometry");
 const span=spanFt*12,halfRoom=roomWidthFt*6,mid=span/2;
 const slope=pitchRisePer12/12;
 const eaveHeight=heel;
 const roofAtRoomWall=eaveHeight+(mid-halfRoom)*slope;
 const available=roofAtRoomWall-floor;
 const required=requiredClearHeightFt*12;
 if(available<required)throw new Error("Attic room clearance exceeds roof envelope");
 const room:PointInches[]=[
  {x:mid-halfRoom,y:floor},{x:mid+halfRoom,y:floor},
  {x:mid+halfRoom,y:floor+required},{x:mid-halfRoom,y:floor+required}
 ];
 return {
  family:"attic",
  roof:[{x:0,y:eaveHeight},{x:mid,y:eaveHeight+mid*slope},{x:span,y:eaveHeight}],
  room,roomWidthIn:roomWidthFt*12,requiredClearHeightIn:required,
  availableClearHeightIn:available,status:"GEOMETRY_ONLY_NOT_ENGINEERED",
  warnings:[
   "Geometric clearance only; member depth, roof sheathing, insulation, finishes and service space reduce actual clearance.",
   "No floor loading, webs, openings, lumber capacity, connector plates, or attic-truss structural design.",
   "NOT a truss fabrication or building approval."
  ]
 };
}
