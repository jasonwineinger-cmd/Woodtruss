import type { LumberCatalog, LumberReference } from "./catalog.js";
import { reviewPreliminaryStockFrontier, type PreliminaryStockOffer, type SchematicMemberStockNeed } from "./stock-frontier.js";

export interface StockCaseExpectation {
  memberId: string;
  schematicRecordId: string;
  requiredCases: readonly { caseId: string; basisId: string }[];
}
const identityFields = ["referenceValueId","speciesGroup","grade","nominalSize","actualWidthIn","actualDepthIn",
  "referenceEdition","referencePublisher","referenceTable"] as const;
type ReferenceIdentity = Pick<LumberReference, typeof identityFields[number]>;
export interface StockOptionEvidence {
  memberId: string;
  schematicRecordId: string;
  offerId: string;
  stockRecordId: string;
  reportedStockLengthIn: number;
  schematicConstraints: Pick<SchematicMemberStockNeed,
    "memberLengthIn" | "addedLengthIn" | "maxWidthIn" | "maxDepthIn" | "allowedReferenceValueIds">;
  catalogId: string;
  reference: ReferenceIdentity;
  caseReviews: readonly {
    caseId: string;
    basisId: string;
    reviewRecordId: string;
    disposition: "documented-for-schematic-review" | "held";
  }[];
}

const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const idOrder = (a: string,b: string) => a < b ? -1 : a > b ? 1 : 0;
const sameConstraints = (receipt:StockOptionEvidence["schematicConstraints"] | undefined,
  expected:StockOptionEvidence["schematicConstraints"]) => !!receipt &&
  receipt.memberLengthIn === expected.memberLengthIn && receipt.addedLengthIn === expected.addedLengthIn &&
  receipt.maxWidthIn === expected.maxWidthIn && receipt.maxDepthIn === expected.maxDepthIn &&
  Array.isArray(receipt.allowedReferenceValueIds) &&
  JSON.stringify([...receipt.allowedReferenceValueIds].sort(idOrder)) === JSON.stringify(expected.allowedReferenceValueIds);
const pairKey = (member: string,offer: string) => JSON.stringify([member,offer]);

/** Exact caller-supplied evidence cross-check, not authentication, capacity
 * evaluation, a claimed set of code load cases or a material recommendation. */
export function reviewPreliminaryStockWithCaseEvidence(
  catalog: LumberCatalog, offers: readonly PreliminaryStockOffer[], needs: readonly SchematicMemberStockNeed[],
  expectations: readonly StockCaseExpectation[], evidence: readonly StockOptionEvidence[],
) {
  const schematic = reviewPreliminaryStockFrontier(catalog, offers, needs);
  const members = new Map(needs.map(need => [need.memberId,need]));
  const stock = new Map(offers.map(offer => [offer.offerId,offer]));
  const references = new Map(catalog.records.map(row => [row.referenceValueId,row]));
  const required = new Map<string, Map<string,string>>();
  for (const expectation of expectations) {
    const need = members.get(expectation?.memberId);
    if (!need || required.has(expectation.memberId) || expectation.schematicRecordId !== need.schematicRecordId ||
      !Array.isArray(expectation.requiredCases) || !expectation.requiredCases.length)
      throw new Error("Unknown, duplicate, missing or stale member case expectations");
    const cases = new Map<string,string>();
    for (const entry of expectation.requiredCases) {
      if (!entry || !text(entry.caseId) || !text(entry.basisId) || cases.has(entry.caseId))
        throw new Error("Explicit unique named case and basis expectations are required");
      cases.set(entry.caseId,entry.basisId);
    }
    required.set(need.memberId,cases);
  }
  if (required.size !== members.size) throw new Error("Missing explicit case expectations for one or more members");
  const receipts = new Map<string,StockOptionEvidence>();
  for (const entry of evidence) {
    if (!entry || !members.has(entry.memberId) || !stock.has(entry.offerId))
      throw new Error("Unknown stock option evidence scope");
    const key = pairKey(entry.memberId,entry.offerId);
    if (receipts.has(key)) throw new Error("Duplicate stock option evidence scope");
    receipts.set(key,entry);
  }
  return { ...schematic, members: schematic.members.map(member => {
    const expected = required.get(member.memberId)!;
    const candidates = member.candidates.map(candidate => {
      const receipt = receipts.get(pairKey(member.memberId,candidate.offerId));
      const reference = references.get(candidate.referenceValueId)!;
      const evidenceHolds: string[] = [];
      if (!receipt) evidenceHolds.push("Missing exact stock option evidence");
      else if (receipt.schematicRecordId !== member.schematicRecordId ||
        !sameConstraints(receipt.schematicConstraints,member.schematicConstraints) || receipt.stockRecordId !== candidate.stockRecordId ||
        receipt.reportedStockLengthIn !== candidate.reportedStockLengthIn || receipt.catalogId !== catalog.catalogId ||
        !receipt.reference || !identityFields.every(field => receipt.reference[field] === reference[field]))
        evidenceHolds.push("Stale stock, catalog reference or schematic identity");
      const observed = new Set<string>();
      for (const review of Array.isArray(receipt?.caseReviews) ? receipt.caseReviews : []) {
        if (!review || !expected.has(review.caseId)) {
          evidenceHolds.push("Unknown named case receipt");
          continue;
        }
        if (observed.has(review.caseId)) {
          evidenceHolds.push("Duplicate named case receipt: " + review.caseId);
          continue;
        }
        observed.add(review.caseId);
        if (review.basisId !== expected.get(review.caseId) || !text(review.reviewRecordId))
          evidenceHolds.push("Missing or stale basis for named case: " + review.caseId);
        if (review.disposition !== "documented-for-schematic-review")
          evidenceHolds.push("Named case remains held: " + review.caseId);
      }
      for (const caseId of [...expected.keys()].sort(idOrder))
        if (!observed.has(caseId)) evidenceHolds.push("Missing named case receipt: " + caseId);
      return { ...candidate, schematicEligible:candidate.eligible,
        eligible:candidate.eligible && !evidenceHolds.length, evidenceHolds:evidenceHolds.sort(idOrder) };
    });
    const eligible = candidates.filter(candidate => candidate.eligible && candidate.unusedLengthIn !== null);
    const frontierOfferIds = eligible.filter(left => !eligible.some(right =>
      right.areaIn2 <= left.areaIn2 && right.unusedLengthIn! <= left.unusedLengthIn! &&
      (right.areaIn2 < left.areaIn2 || right.unusedLengthIn! < left.unusedLengthIn!))).map(row=>row.offerId);
    return { ...member, candidates, frontierOfferIds, evidenceStatus:frontierOfferIds.length ?
      "DOCUMENTED_NOT_VERIFIED" as const : "HOLD_NO_EVIDENCE_ELIGIBLE_STOCK" as const,
      requiredCases:[...expected].sort(([a],[b])=>idOrder(a,b)).map(([caseId,basisId])=>({caseId,basisId})) };
  }), ndsReady:false as const, evidenceIndependentlyVerified:false as const, warnings:[...schematic.warnings,
    "Named case receipts are caller documentation only; they are neither independently verified nor design capacity checks."] };
}
