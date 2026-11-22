import type {ElasticFrameRectangularStressExtremum} from "./elastic-frame-rectangular-stress-extrema.js";

type Limits<T> = { min:T; max:T };
type Faces<T> = { positiveDepth:Limits<T>; negativeDepth:Limits<T> };
export type ElasticFrameStressCaseSelectionInput = {
  caseId:string;
  memberRectangularStressExtrema:Readonly<Record<string,Faces<ElasticFrameRectangularStressExtremum>>>;
};
export type SelectedElasticFrameStressCase = ElasticFrameRectangularStressExtremum & {caseId:string};

const identifier=(v:unknown):v is string=>typeof v==="string"&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(v);
const own=(v:object,key:string)=>Object.prototype.propertyIsEnumerable.call(v,key);
function dictionary(v:unknown):v is Record<string,unknown>{
  return !!v&&typeof v==="object"&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
}
function exact(v:unknown,keys:readonly string[]):boolean{
  return dictionary(v)&&Reflect.ownKeys(v).length===keys.length&&keys.every(key=>own(v,key));
}
const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const faceKeys=["positiveDepth","negativeDepth"] as const;
const solverFaceKeys=[...faceKeys,"status","fabricationAuthorized"];
function knownFaces(value:unknown) {
  return dictionary(value) && (exact(value,faceKeys) ||
    (exact(value,solverFaceKeys) && value.status==="PRELIMINARY_NOT_ENGINEERED" &&
      value.fabricationAuthorized===false));
}
const rowKeys=["stationIn","side","normalStressPsi","axialLb","shearLb","momentLbIn"] as const;
function checkedRow(row:ElasticFrameRectangularStressExtremum){
  if(!exact(row,rowKeys)||!finite(row.stationIn)||row.stationIn<0||
      ![row.axialLb,row.shearLb,row.momentLbIn,row.normalStressPsi].every(finite)||
      (row.side!=="left"&&row.side!=="right"&&row.side!=="continuous"))
    throw new Error("Invalid coincident elastic frame stress case row");
  return row;
}

/** Signed extrema across already verified case replays on one fixed model.
 * Carries the complete governing row; never combines independently selected
 * stresses, stations or actions. Exact ties retain the first authored case.
 * This is not a source authentication or design/approval step. */
export function selectElasticFrameStressCases(
  caseResults:readonly ElasticFrameStressCaseSelectionInput[],expectedMemberIds:readonly string[],
):Record<string,Faces<SelectedElasticFrameStressCase>> {
  if(!Array.isArray(expectedMemberIds)||!expectedMemberIds.length||
      !Array.from(expectedMemberIds).every(identifier)||new Set(expectedMemberIds).size!==expectedMemberIds.length||
      !Array.isArray(caseResults)||!caseResults.length)
    throw new Error("Explicit unique stress case coverage and member identities are required");
  const seenCases=new Set<string>();
  const selection=new Map<string,Faces<SelectedElasticFrameStressCase>>();
  for(const item of caseResults as readonly ElasticFrameStressCaseSelectionInput[]) {
    if(!exact(item,["caseId","memberRectangularStressExtrema"])||!identifier(item.caseId)||seenCases.has(item.caseId))
      throw new Error("Invalid or repeated elastic frame stress case identity");
    seenCases.add(item.caseId);
    const members=item.memberRectangularStressExtrema;
    if(!exact(members,expectedMemberIds))
      throw new Error("Elastic frame stress case does not match the exact requested member set");
    for(const memberId of expectedMemberIds) {
      const faces=members[memberId];
      // The existing per-member solver output carries preliminary status
      // flags beside its two faces; only consume the explicit signed limits.
      if(!knownFaces(faces))
        throw new Error("Both rectangular stress faces are required in every case");
      const checked=new Map<typeof faceKeys[number],Limits<SelectedElasticFrameStressCase>>();
      const actionAt=new Map<string,ElasticFrameRectangularStressExtremum>();
      for(const face of faceKeys) {
        const bounds=faces[face];
        if(!exact(bounds,["min","max"]))throw new Error("Invalid elastic frame stress case limits");
        const min=checkedRow(bounds.min),max=checkedRow(bounds.max);
        if(min.normalStressPsi>max.normalStressPsi||
           (min.stationIn===max.stationIn&&min.side===max.side&&min.normalStressPsi!==max.normalStressPsi))
          throw new Error("Elastic frame stress limits are inconsistent at their signed cuts");
        for(const row of [min,max]) {
          const cut=JSON.stringify([row.stationIn,row.side]);
          const prior=actionAt.get(cut);
          if(prior&&(prior.axialLb!==row.axialLb||prior.shearLb!==row.shearLb||prior.momentLbIn!==row.momentLbIn))
            throw new Error("Elastic frame stress limits disagree on coincident cut actions");
          actionAt.set(cut,row);
        }
        checked.set(face,{min:{...min,caseId:item.caseId},max:{...max,caseId:item.caseId}});
      }
      const prior=selection.get(memberId);
      const positiveDepth=checked.get("positiveDepth")!,negativeDepth=checked.get("negativeDepth")!;
      if(!prior){ selection.set(memberId,{positiveDepth,negativeDepth}); continue; }
      for(const face of faceKeys){
        const next=face==="positiveDepth"?positiveDepth:negativeDepth;
        if(next.min.normalStressPsi<prior[face].min.normalStressPsi)prior[face].min=next.min;
        if(next.max.normalStressPsi>prior[face].max.normalStressPsi)prior[face].max=next.max;
      }
    }
  }
  return Object.fromEntries(selection);
}
