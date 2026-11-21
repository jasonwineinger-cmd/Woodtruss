import type {LumberCatalog} from "./catalog.js";
import {validateLumberCatalog} from "./catalog.js";
import type {LoadEnvelope} from "../../analysis/src/envelope.js";

/** Ranked material takeoff candidates; NO structural sizing approval.
 * The ordering is by cross-sectional area, NOT engineering adequacy.
 */
export interface MaterialCandidate {
 memberId:string;referenceValueId:string;areaIn2:number;
 maxTensionStressPsi:number;maxCompressionStressPsi:number;
 approvedForStructuralUse:false;status:"PRELIMINARY_NOT_ENGINEERED";
}
export function rankPreliminaryMaterialCandidates(envelope:LoadEnvelope,catalog:LumberCatalog):MaterialCandidate[] {
 if(envelope.status!=="PRELIMINARY_NOT_ENGINEERED")throw new Error("Invalid force envelope status");
 validateLumberCatalog(catalog);
 const out:MaterialCandidate[]=[];
 for(const [memberId,forces] of Object.entries(envelope.memberForces)){
  if(!memberId||![forces.minLb,forces.maxLb].every(Number.isFinite)||forces.minLb>forces.maxLb)
   throw new Error("Invalid member force range");
  for(const record of catalog.records){
   const areaIn2=record.actualWidthIn*record.actualDepthIn;
   out.push({memberId,referenceValueId:record.referenceValueId,areaIn2,
    maxTensionStressPsi:Math.max(0,forces.maxLb)/areaIn2,
    maxCompressionStressPsi:Math.max(0,-forces.minLb)/areaIn2,
    approvedForStructuralUse:false,status:"PRELIMINARY_NOT_ENGINEERED"});
  }
 }
 return out.sort((a,b)=>a.memberId.localeCompare(b.memberId)||a.areaIn2-b.areaIn2||a.referenceValueId.localeCompare(b.referenceValueId));
}
