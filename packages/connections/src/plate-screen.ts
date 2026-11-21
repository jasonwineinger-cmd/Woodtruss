/** Plate demand inventory only. No manufacturer plate capacities or TPI approvals. */
export interface PlateReference {
 plateId:string;manufacturer:string;productCode:string;referenceDocument:string;
 lengthIn:number;widthIn:number;
}
export interface PlateDemand {
 jointId:string;incidentMemberIds:string[];candidatePlateIds:string[];
 status:"UNVERIFIED_CONNECTION";
 fabricationAuthorized:false;
 missingChecks:string[];
}
export function inventoryConnectorPlateDemands(
 joints:{id:string}[],members:{id:string;start:string;end:string}[],plates:PlateReference[]
):PlateDemand[] {
 const ids=new Set(joints.map(j=>j.id));
 if(ids.size!==joints.length||ids.has(""))throw new Error("Duplicate or empty joint ID");
 const plateIds=new Set<string>();
 for(const p of plates){
  if(!p.plateId.trim()||plateIds.has(p.plateId)||!p.manufacturer.trim()||
   !p.productCode.trim()||!p.referenceDocument.trim()||
   !Number.isFinite(p.lengthIn)||p.lengthIn<=0||
   !Number.isFinite(p.widthIn)||p.widthIn<=0)
   throw new Error("Invalid plate reference");
  plateIds.add(p.plateId);
 }
 const memberIds=new Set<string>();
 for(const m of members){
  if(!m.id.trim()||memberIds.has(m.id)||m.start===m.end||!ids.has(m.start)||!ids.has(m.end))
   throw new Error("Invalid connection member");
  memberIds.add(m.id);
 }
 return joints.map(j=>({
  jointId:j.id,incidentMemberIds:members.filter(m=>m.start===j.id||m.end===j.id).map(m=>m.id),
  candidatePlateIds:plates.map(p=>p.plateId),
  status:"UNVERIFIED_CONNECTION" as const,fabricationAuthorized:false as const,
  missingChecks:["TPI/manufacturer plate capacities and orientation","Tooth embedment and grip",
   "Joint force transfer and plate-to-wood bearing","Plate placement, edge distances and splice design",
   "Independent engineering review"]
 }));
}
