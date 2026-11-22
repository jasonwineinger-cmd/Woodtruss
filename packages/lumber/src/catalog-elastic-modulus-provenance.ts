import { snapshotElasticFrameReviewData } from "../../analysis/src/elastic-frame-reviewed-plain-data.js";
import { auditCatalogElasticMemberStiffness } from "./catalog-elastic-member-stiffness.js";
import { catalogElasticModulusSourceRowMatches } from "./catalog-elastic-modulus-source-row.js";
import type { LumberCatalog } from "./catalog.js";

type Assignment = { modelId:string;modelRevision:string;memberId:string;startNodeId:string;endNodeId:string;
  bendingAxis:"about-width"|"about-depth";assignmentRecordId:string;referenceValueId:string;modulusBasis:"catalog-mean"|"catalog-minimum" };
const noAuthority = {sourceIndependentlyVerified:false,approvedForStructuralUse:false,
  shearReconciled:false,releasesIndependentlyVerified:false,fabricationAuthorized:false,
  shippingAuthorized:false,machineReleaseAuthorized:false,sourceBytesVerified:false,ndsReady:false} as const;
const hold=(reason:string)=>({status:"HOLD_CATALOG_ELASTIC_MODULUS_PROVENANCE" as const,outstanding:[reason],...noAuthority});
function exact<K extends string>(value:unknown,keys:readonly K[]):value is Record<K,unknown> {
  return !!value&&typeof value==="object"&&!Array.isArray(value)&&
    Reflect.ownKeys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
}
function byAssignment(value:unknown,count:number) {
  if(!Array.isArray(value)||value.length!==count)return null;
  const rows=new Map<string,unknown>();
  for(const row of value as unknown[]){
    if(!row||typeof row!=="object"||!Object.hasOwn(row,"assignmentRecordId"))return null;
    const key=(row as {assignmentRecordId?:unknown}).assignmentRecordId;
    if(typeof key!=="string"||rows.has(key))return null;
    rows.set(key,row);
  }
  return rows;
}
/** Join the exact directed numeric audit to separately expected documentary
 * source roles. A documented match does not read publisher bytes or approve
 * use of grading values, actual stock, geometry, or fabrication. */
export function auditCatalogElasticModulusProvenance(input:unknown) {
  try{
    const data=snapshotElasticFrameReviewData(input);
    if(!exact(data,["audit","expectedSources","receipts"]))return hold("Exact modulus source and directed audit fields are required");
    const {audit,expectedSources,receipts}=data;
    const matched=auditCatalogElasticMemberStiffness(audit);
    if(matched.status!=="CATALOG_ELASTIC_MEMBER_STIFFNESS_MATCH_ONLY")
      return hold("The exact directed member stiffness audit must match first");
    // The same detached inputs passed the full exact member/catalog audit.
    const {catalog,assignments}=audit as {catalog:LumberCatalog;assignments:readonly Assignment[]};
    const expected=byAssignment(expectedSources,matched.matchedCount),observed=byAssignment(receipts,matched.matchedCount);
    if(!expected||!observed)return hold("Every directed assignment requires a separate exact source expectation and receipt");
    const reference=new Map(catalog.records.map(row=>[row.referenceValueId,row]));
    for(const a of assignments){
      const row=reference.get(a.referenceValueId)!;
      const quantity=a.modulusBasis==="catalog-mean"?"E" as const:"Emin" as const;
      const context={modelId:a.modelId,modelRevision:a.modelRevision,memberId:a.memberId,startNodeId:a.startNodeId,
        endNodeId:a.endNodeId,bendingAxis:a.bendingAxis,assignmentRecordId:a.assignmentRecordId,catalogId:catalog.catalogId,referenceValueId:row.referenceValueId,
        quantity,publisher:row.referencePublisher,edition:row.referenceEdition,table:row.referenceTable,
        speciesGroup:row.speciesGroup,grade:row.grade,nominalSize:row.nominalSize,actualWidthIn:row.actualWidthIn,
        actualDepthIn:row.actualDepthIn,valuePsi:quantity==="E"?row.ePsi:row.eMinPsi};
      if(!catalogElasticModulusSourceRowMatches(expected.get(a.assignmentRecordId),observed.get(a.assignmentRecordId),context))
        return hold("A private source receipt does not match the independent selected role, stock row, or artifact");
    }
    return {status:"CATALOG_ELASTIC_MODULUS_PROVENANCE_MATCH_ONLY" as const,matchedCount:matched.matchedCount,
      outstanding:[],...noAuthority};
  }catch{
    return hold("The directed modulus source documentation was malformed or uncheckable");
  }
}
