import type {LoadEnvelope} from "../../analysis/src/envelope.js";
import type {LumberCatalog} from "./catalog.js";
import {validateLumberCatalog} from "./catalog.js";

/** Axial demand preview for each candidate section.
 * Does not calculate adjusted design capacity or select an approved member.
 */
export interface MemberAxialDemand {
  memberId:string;
  referenceValueId:string;
  tensionDemandLb:number;
  compressionDemandLb:number;
  tensionStressPsi:number;
  compressionStressPsi:number;
  tensionCase:string|null;
  compressionCase:string|null;
  approvedForStructuralUse:false;
  warnings:string[];
}
export function previewEnvelopeLumberDemand(
 envelope:LoadEnvelope,catalog:LumberCatalog
):MemberAxialDemand[] {
 if(envelope.status!=="PRELIMINARY_NOT_ENGINEERED")throw new Error("Unsupported envelope status");
 validateLumberCatalog(catalog);
 const output:MemberAxialDemand[]=[];
 for(const [memberId,forces] of Object.entries(envelope.memberForces)){
   if(!memberId || ![forces.minLb,forces.maxLb].every(Number.isFinite) ||
      forces.minLb>forces.maxLb || !forces.governingMinCase || !forces.governingMaxCase)
     throw new Error("Invalid member envelope");
   const tensionDemandLb=Math.max(0,forces.maxLb);
   const compressionDemandLb=Math.max(0,-forces.minLb);
   for(const lumber of catalog.records){
     const area=lumber.actualWidthIn*lumber.actualDepthIn;
     output.push({
       memberId,referenceValueId:lumber.referenceValueId,
       tensionDemandLb,compressionDemandLb,
       tensionStressPsi:tensionDemandLb/area,
       compressionStressPsi:compressionDemandLb/area,
       tensionCase:tensionDemandLb>0?forces.governingMaxCase:null,
       compressionCase:compressionDemandLb>0?forces.governingMinCase:null,
       approvedForStructuralUse:false,
       warnings:[
         "Reference design values are not adjusted for NDS factors",
         "Buckling, bending, shear, connection capacity, and lateral bracing unchecked",
         "No fabrication approval or automatic lumber selection"
       ]
     });
   }
 }
 return output;
}
