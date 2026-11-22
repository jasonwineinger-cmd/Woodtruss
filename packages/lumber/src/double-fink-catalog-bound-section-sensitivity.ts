import { snapshotElasticFrameReviewData } from "../../analysis/src/elastic-frame-reviewed-plain-data.js";
import { reviewDoubleFinkCatalogBoundSectionDemands } from "./double-fink-catalog-bound-section-review.js";

const decisionFlags={
  allModelMembersVerified:false,sourceIndependentlyVerified:false,sourceBytesVerified:false,
  approvedForStructuralUse:false,shearReconciled:false,releasesIndependentlyVerified:false,ndsReady:false,
  shippingAuthorized:false,fabricationAuthorized:false,machineReleaseAuthorized:false,
} as const;
const hold=()=>({status:"HOLD_DOUBLE_FINK_CATALOG_BOUND_SECTION_SENSITIVITY" as const,cases:[],
  changedUnselectedMembers:[],outstanding:["Exact comparable revisions and complete selected-member evidence are required"],
  ...decisionFlags});
const envelope=["study","catalog","assignments","expectedSources","receipts"] as const;
const studyFields=["modelId","modelRevision","roof","memberAssignments","supports","sources","combinations","caseCuts"] as const;
const stiffness=["areaIn2","secondMomentIn4","elasticModulusPsi"] as const;
const force=["axialLb","shearLb","momentLbIn"] as const;
type Row=Record<string,unknown>;
const record=(v:unknown):v is Row=>!!v&&typeof v==="object"&&!Array.isArray(v);
const exact=<K extends string>(v:unknown,keys:readonly K[]):v is Record<K,unknown>=>
  record(v)&&Reflect.ownKeys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
// Snapshots already canonicalize record key order. Array order is retained
// for load/case/selection contracts; independently ID-keyed rows are indexed.
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const except=(row:Row,fields:readonly string[])=>Object.fromEntries(Object.entries(row).filter(([k])=>!fields.includes(k)));
const id=(v:unknown):v is string=>typeof v==="string"&&v.length>0;
function index(rows:unknown,key:string){
  if(!Array.isArray(rows))return null;
  const out=new Map<string,Row>();
  for(const row of rows as unknown[]){
    if(!record(row)||!id(row[key])||out.has(row[key]))return null;
    out.set(row[key],row);
  }
  return out;
}
function sameRows(a:unknown,b:unknown,key:string,ignored:readonly string[]=[]){
  const first=index(a,key), second=index(b,key);
  return !!first&&!!second&&first.size===second.size&&[...first].every(([id,row])=>{
    const other=second.get(id);
    return other!==undefined&&equal(except(row,ignored),except(other,ignored));
  });
}
function selectedIds(value:unknown) {
  if(!Array.isArray(value))return null;
  const ids=new Set<string>();
  for(const row of value as unknown[]){
    if(!record(row)||!Array.isArray(row.memberCuts))return null;
    for(const member of row.memberCuts as unknown[]){
      if(!record(member)||!id(member.memberId))return null;
      ids.add(member.memberId);
    }
  }
  return ids.size?ids:null;
}

/** Compare two freshly solved documentary section reviews while changing only
 * named unselected member A/I/E. This is numerical sensitivity, not stock,
 * model validation, allowable demand, or fabrication authority. */
export function reviewDoubleFinkCatalogBoundSectionSensitivity(input:unknown){
  try{
    const data=snapshotElasticFrameReviewData(input);
    if(!exact(data,["baseline","alternative"])||!exact(data.baseline,envelope)||!exact(data.alternative,envelope))
      return hold();
    const {baseline,alternative}=data;
    if(!exact(baseline.study,studyFields)||!exact(alternative.study,studyFields))return hold();
    const a=baseline.study,b=alternative.study;
    if(!id(a.modelRevision)||!id(b.modelRevision)||a.modelRevision===b.modelRevision||
      !equal(except(a,["modelRevision","memberAssignments"]),except(b,["modelRevision","memberAssignments"]))||
      !equal(baseline.catalog,alternative.catalog)||
      !sameRows(baseline.assignments,alternative.assignments,"assignmentRecordId",["modelRevision"])||
      !sameRows(baseline.expectedSources,alternative.expectedSources,"assignmentRecordId",["modelRevision"])||
      !sameRows(baseline.receipts,alternative.receipts,"assignmentRecordId",["modelRevision"]))return hold();

    const selected=selectedIds(a.caseCuts), first=index(a.memberAssignments,"memberId"), second=index(b.memberAssignments,"memberId");
    if(!selected||!first||!second||first.size!==second.size)return hold();
    const changedUnselectedMembers=[];
    for(const [memberId,row] of first){
      const other=second.get(memberId);
      if(!other||!id(row.startNodeId)||!id(row.endNodeId)||
        !equal(except(row,stiffness),except(other,stiffness)))return hold();
      const changedProperties=stiffness.filter(k=>row[k]!==other[k]);
      if(changedProperties.length){
        if(selected.has(memberId))return hold();
        changedUnselectedMembers.push({memberId,startNodeId:row.startNodeId,endNodeId:row.endNodeId,changedProperties});
      }
    }
    if(!changedUnselectedMembers.length)return hold();
    changedUnselectedMembers.sort((a,b)=>a.memberId<b.memberId?-1:a.memberId>b.memberId?1:0);

    const before=reviewDoubleFinkCatalogBoundSectionDemands(baseline);
    const after=reviewDoubleFinkCatalogBoundSectionDemands(alternative);
    if(before.status!=="DOUBLE_FINK_CATALOG_BOUND_SECTION_REVIEW_ONLY"||
       after.status!=="DOUBLE_FINK_CATALOG_BOUND_SECTION_REVIEW_ONLY"||
       before.selectedMemberCount!==selected.size||after.selectedMemberCount!==selected.size||
       before.cases.length!==after.cases.length)return hold();

    const cases=before.cases.map(({caseId,memberCuts},i)=>{
      const next=after.cases[i];
      if(next.caseId!==caseId||next.memberCuts.length!==memberCuts.length)throw new Error("Case mismatch");
      return {caseId,memberCuts:memberCuts.map(({memberId,startNodeId,endNodeId,cuts},j)=>{
        const nextMember=next.memberCuts[j];
        if(nextMember.memberId!==memberId||nextMember.startNodeId!==startNodeId||
           nextMember.endNodeId!==endNodeId||nextMember.cuts.length!==cuts.length)throw new Error("Member mismatch");
        return {memberId,startNodeId,endNodeId,cuts:cuts.map(({stationIn,side,...from},k)=>{
          const {stationIn:nextStation,side:nextSide,...to}=nextMember.cuts[k];
          if(nextStation!==stationIn||nextSide!==side)throw new Error("Cut mismatch");
          const delta={axialLb:0,shearLb:0,momentLbIn:0};
          for(const key of force){
            const change=to[key]-from[key];
            if(!Number.isFinite(from[key])||!Number.isFinite(to[key])||!Number.isFinite(change))throw new Error("Cut difference not finite");
            delta[key]=change===0?0:change;
          }
          return {stationIn,side,baseline:from,alternative:to,delta};
        })};
      })};
    });
    return {
      status:"DOUBLE_FINK_CATALOG_BOUND_SECTION_SENSITIVITY_REVIEW_ONLY" as const,modelId:before.modelId,
      baselineModelRevision:before.modelRevision,alternativeModelRevision:after.modelRevision,
      selectedMemberCount:selected.size,changedUnselectedMembers,cases,outstanding:[],
      ...decisionFlags,
    };
  }catch{return hold();}
}
