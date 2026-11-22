import { snapshotElasticFrameReviewData } from "../../analysis/src/elastic-frame-reviewed-plain-data.js";
import { validateLumberCatalog, type LumberCatalog } from "./catalog.js";
import { catalogElasticSectionMatches } from "./catalog-elastic-section-axis-check.js";

const MAX_ROWS = 10_000;
const memberKeys = ["id","startNodeId","endNodeId","areaIn2","secondMomentIn4","elasticModulusPsi",
  "releaseStartRotation","releaseEndRotation"] as const;
const assignmentKeys = ["modelId","modelRevision","memberId","startNodeId","endNodeId","catalogId","referenceValueId",
  "bendingAxis","modulusBasis","assignmentRecordId"] as const;
const catalogRowKeys = ["speciesGroup","grade","nominalSize","actualWidthIn","actualDepthIn","referenceEdition",
  "referencePublisher","referenceTable","referenceValueId","fbPsi","ftPsi","fcPsi","fvPsi","ePsi","eMinPsi"] as const;
const id = (value:unknown):value is string => typeof value === "string" && value.length > 0 &&
  value.length <= 512 && value.trim() === value && !/\p{Cc}/u.test(value);
const property = (value:unknown):value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
function exact<K extends string>(value:unknown, keys:readonly K[]):value is Record<K,unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
}
const noAuthority = {sourceIndependentlyVerified:false,approvedForStructuralUse:false,
  shearReconciled:false,releasesIndependentlyVerified:false,fabricationAuthorized:false,
  shippingAuthorized:false,machineReleaseAuthorized:false} as const;
const hold = (reason:string) => ({status:"HOLD_CATALOG_ELASTIC_MEMBER_STIFFNESS" as const,outstanding:[reason],...noAuthority});

/** Audit supplied gross sections and E only. No selection of model or catalog,
 * solve, source authentication, actual restraint, shear, or release. */
export function auditCatalogElasticMemberStiffness(input:unknown) {
  try {
    const data = snapshotElasticFrameReviewData(input);
    if (!exact(data,["modelId","modelRevision","members","catalog","assignments"]) ||
        !id(data.modelId) || !id(data.modelRevision) || !Array.isArray(data.members) ||
        data.members.length < 1 || data.members.length > MAX_ROWS || !Array.isArray(data.assignments) ||
        data.assignments.length !== data.members.length)
      return hold("Exact model revision and complete bounded member assignments are required");
    if (!exact(data.catalog,["catalogId","records"]) || !id(data.catalog.catalogId) ||
        !Array.isArray(data.catalog.records) || !data.catalog.records.length || data.catalog.records.length > MAX_ROWS ||
        !(data.catalog.records as unknown[]).every(row => exact(row,catalogRowKeys) &&
          [row.speciesGroup,row.grade,row.nominalSize,row.referenceEdition,row.referencePublisher,row.referenceTable,row.referenceValueId].every(id)))
      return hold("An exact bounded catalog and row provenance are required");
    const catalog = data.catalog as unknown as LumberCatalog;
    validateLumberCatalog(catalog);
    const byReference = new Map(catalog.records.map(row => [row.referenceValueId,row]));
    const members = new Map<string,{startNodeId:string;endNodeId:string;areaIn2:number;secondMomentIn4:number;elasticModulusPsi:number}>();
    for (const member of data.members as unknown[]) {
      if (member && typeof member === "object" && Object.hasOwn(member,"shear"))
        return hold("Shear options have no matching declaration in this gross-section audit");
      if (!exact(member,memberKeys) || !id(member.id) || members.has(member.id) ||
          !id(member.startNodeId) || !id(member.endNodeId) || member.startNodeId === member.endNodeId ||
          typeof member.releaseStartRotation !== "boolean" || typeof member.releaseEndRotation !== "boolean" ||
          !property(member.areaIn2) || !property(member.secondMomentIn4) || !property(member.elasticModulusPsi))
        return hold("Exact unique directed member rows with explicit elastic properties are required");
      members.set(member.id,{startNodeId:member.startNodeId,endNodeId:member.endNodeId,
        areaIn2:member.areaIn2,secondMomentIn4:member.secondMomentIn4,elasticModulusPsi:member.elasticModulusPsi});
    }
    const seenMembers = new Set<string>(), seenReceipts = new Set<string>();
    for (const a of data.assignments as unknown[]) {
      if (!exact(a,assignmentKeys) || a.modelId !== data.modelId || a.modelRevision !== data.modelRevision ||
          a.catalogId !== catalog.catalogId || !id(a.memberId) || seenMembers.has(a.memberId) ||
          !id(a.referenceValueId) || !id(a.assignmentRecordId) || seenReceipts.has(a.assignmentRecordId))
        return hold("Each assignment must bind the exact model revision, catalog and a unique member and receipt");
      const member = members.get(a.memberId), record = byReference.get(a.referenceValueId);
      if (!member || a.startNodeId !== member.startNodeId || a.endNodeId !== member.endNodeId ||
          !record || !catalogElasticSectionMatches(record,member,a.bendingAxis,a.modulusBasis))
        return hold("A declared directed assignment does not match the gross section axis or selected elastic modulus");
      seenMembers.add(a.memberId);
      seenReceipts.add(a.assignmentRecordId);
    }
    return {status:"CATALOG_ELASTIC_MEMBER_STIFFNESS_MATCH_ONLY" as const,matchedCount:seenMembers.size,outstanding:[],...noAuthority};
  } catch {
    return hold("The supplied catalog or directed member evidence was uncheckable");
  }
}
