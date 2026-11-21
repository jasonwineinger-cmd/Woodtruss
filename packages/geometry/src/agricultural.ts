import type {RoofInput,PointInches} from "./index.js";

/** Agricultural roof planning geometry only; not a structural truss topology. */
export interface AgriculturalOutline {
 family:"agricultural";spanIn:number;
 bearingLeft:PointInches;bearingRight:PointInches;
 roofProfile:PointInches[];
 bottomChord:PointInches[];
 status:"GEOMETRY_ONLY_NOT_ENGINEERED";
 warnings:string[];
}
export function generateAgriculturalOutline(input:RoofInput):AgriculturalOutline {
 if(input.family!=="agricultural")throw new Error("Agricultural family required");
 const {spanFt,pitchRisePer12}=input;
 const heel=input.heelHeightIn??0,overhang=input.overhangIn??0;
 if(![spanFt,pitchRisePer12,heel,overhang].every(Number.isFinite)||
    spanFt<8||spanFt>50||pitchRisePer12<=0||pitchRisePer12>18||
    heel<0||heel>48||overhang<0||overhang>48)
  throw new Error("Invalid agricultural roof parameters");
 const spanIn=spanFt*12,slope=pitchRisePer12/12;
 const roofProfile:PointInches[]=[
  {x:-overhang,y:heel-overhang*slope},
  {x:spanIn/2,y:heel+spanIn/2*slope},
  {x:spanIn+overhang,y:heel-overhang*slope}
 ];
 return {family:"agricultural",spanIn,
  bearingLeft:{x:0,y:0},bearingRight:{x:spanIn,y:0},
  roofProfile,bottomChord:[{x:0,y:0},{x:spanIn,y:0}],
  status:"GEOMETRY_ONLY_NOT_ENGINEERED",
  warnings:["Agricultural roof profile is not a truss design.",
   "Purlin point loads, bracing, uplift, connections, lumber and bearings remain unchecked.",
   "NOT FOR FABRICATION."]};
}
