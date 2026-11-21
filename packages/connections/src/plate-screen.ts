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

export interface SignedPlateMemberDemand {
 memberId:string;
 /** Solver convention: positive tension, negative compression. */
 axialLb:number;
 /** Force the member applies to this joint in model axes, not a plate force. */
 memberOnJointFxLb:number;
 memberOnJointFyLb:number;
}

export interface ScenarioPlateDemand extends PlateDemand {
 scenarios:{scenarioId:string;members:SignedPlateMemberDemand[]}[];
}

type DemandJoint={id:string;x:number;y:number};
type DemandMember={id:string;start:string;end:string};
type SignedForceCase={id:string;axialForceLb:Record<string,number>};

/** Retain coincident signed member-end forces by case, with no governing plate
 * resultant, grip/capacity check, load-factor inference or approval. The caller
 * must supply axial results from the exact same model, not an envelope. This
 * projection alone does not verify that binding; use the bound inventory from
 * plate-model-binding before treating a report as revision-specific evidence.
 */
export function inventoryScenarioConnectorPlateDemands(
 joints:DemandJoint[],members:DemandMember[],plates:PlateReference[],cases:SignedForceCase[]
):ScenarioPlateDemand[] {
 const inventory=inventoryConnectorPlateDemands(joints,members,plates);
 if(!joints.length||!members.length||!cases.length)
  throw new Error("Connector demand requires joints, members, and signed scenarios");
 const jointById=new Map(joints.map(j=>[j.id,j]));
 const memberById=new Map(members.map(m=>[m.id,m]));
 if(joints.some(j=>!j.id.trim()||!Number.isFinite(j.x)||!Number.isFinite(j.y)))
  throw new Error("Invalid connector demand joint coordinates");
 const unitVectors=new Map(members.map(m=>{
  const a=jointById.get(m.start)!,b=jointById.get(m.end)!;
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
  if(!Number.isFinite(length)||length<=0)throw new Error("Invalid connector demand member length");
  return [m.id,{x:dx/length,y:dy/length}] as const;
 }));
 const caseIds=new Set<string>();
 for(const scenario of cases){
  if(!scenario.id.trim()||caseIds.has(scenario.id))
   throw new Error("Duplicate or empty connector demand scenario ID");
  caseIds.add(scenario.id);
  if(Object.keys(scenario.axialForceLb).length!==members.length||
     members.some(m=>!Object.hasOwn(scenario.axialForceLb,m.id)||
       !Number.isFinite(scenario.axialForceLb[m.id])))
   throw new Error("Invalid signed axial coverage for scenario "+scenario.id);
 }
 const normalizeZero=(n:number)=>n===0?0:n;
 return inventory.map(joint=>({...joint,scenarios:cases.map(scenario=>({
  scenarioId:scenario.id,
  members:joint.incidentMemberIds.map(memberId=>{
   const member=memberById.get(memberId)!,unit=unitVectors.get(memberId)!;
   const axialLb=normalizeZero(scenario.axialForceLb[memberId]);
   const direction=member.start===joint.jointId?1:-1;
   return {memberId,axialLb,memberOnJointFxLb:normalizeZero(direction*axialLb*unit.x),
    memberOnJointFyLb:normalizeZero(direction*axialLb*unit.y)};
  })
 }))}));
}
