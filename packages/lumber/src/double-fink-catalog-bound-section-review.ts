import { studyAuthoredDoubleFinkElasticFrameSectionCuts } from "../../analysis/src/double-fink-authored-elastic-frame-section-cuts.js";
import { snapshotElasticFrameReviewData } from "../../analysis/src/elastic-frame-reviewed-plain-data.js";
import { auditCatalogElasticModulusProvenance } from "./catalog-elastic-modulus-provenance.js";

const noAuthority = {
  allModelMembersVerified:false,
  sourceIndependentlyVerified:false,
  sourceBytesVerified:false,
  approvedForStructuralUse:false,
  shearReconciled:false,
  releasesIndependentlyVerified:false,
  ndsReady:false,
  shippingAuthorized:false,
  fabricationAuthorized:false,
  machineReleaseAuthorized:false,
} as const;
const fields = ["study", "catalog", "assignments", "expectedSources", "receipts"] as const;
const exact = (value: unknown): value is Record<typeof fields[number],unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) &&
  Reflect.ownKeys(value).length === fields.length && fields.every(key => Object.hasOwn(value,key));
const hold = (reason: string) => ({
  status:"HOLD_DOUBLE_FINK_CATALOG_BOUND_SECTION_REVIEW" as const,
  selectedMemberCount:0,
  cases:[],
  outstanding:[reason],
  ...noAuthority,
});

/** Join fresh ordinary Double Fink section vectors to documentary modulus
 * records for exactly the selected modeled members. This neither checks the
 * unselected model nor confirms publication, actual stock, or capacity. */
export function reviewDoubleFinkCatalogBoundSectionDemands(input: unknown) {
  try {
    const data = snapshotElasticFrameReviewData(input);
    if (!exact(data) || !Array.isArray(data.assignments) || !data.assignments.length)
      return hold("An exact Double Fink study and selected-member catalog evidence are required");
    if (!(data.assignments as unknown[]).every(row =>
      !!row && typeof row === "object" && Object.hasOwn(row,"modulusBasis") &&
      (row as {modulusBasis:unknown}).modulusBasis === "catalog-mean"))
      return hold("The section review requires explicitly assigned catalog mean elastic modulus");

    const { modelId, modelRevision, frame, cases } = studyAuthoredDoubleFinkElasticFrameSectionCuts(data.study);
    const requested = new Map<string,{startNodeId:string;endNodeId:string}>();
    for (const row of cases) for (const member of row.memberCuts) {
      const prior = requested.get(member.memberId);
      if (prior && (prior.startNodeId !== member.startNodeId || prior.endNodeId !== member.endNodeId))
        return hold("Selected section receipts do not identify the same directed model member");
      requested.set(member.memberId, {startNodeId:member.startNodeId,endNodeId:member.endNodeId});
    }
    // Do not let caller evidence substitute different model properties or add
    // an unselected member to the audited set. This is the freshly solved frame.
    const members = frame.members.filter(member => requested.has(member.id));
    if (!members.length || members.length !== requested.size || members.some(member => {
      const selected = requested.get(member.id)!;
      return selected.startNodeId !== member.startNodeId || selected.endNodeId !== member.endNodeId;
    })) return hold("Selected section receipts lack exact directed model membership");

    const bound = auditCatalogElasticModulusProvenance({
      audit:{modelId,modelRevision,members,catalog:data.catalog,assignments:data.assignments},
      expectedSources:data.expectedSources,
      receipts:data.receipts,
    });
    if (bound.status !== "CATALOG_ELASTIC_MODULUS_PROVENANCE_MATCH_ONLY" || bound.matchedCount !== members.length)
      return hold("Complete catalog section and source documentation must match every selected directed member");

    return {
      status:"DOUBLE_FINK_CATALOG_BOUND_SECTION_REVIEW_ONLY" as const,
      modelId, modelRevision,
      selectedMemberCount:members.length,
      cases,
      outstanding:[],
      ...noAuthority,
    };
  } catch {
    return hold("The authored cut study or selected-member evidence was malformed or uncheckable");
  }
}
