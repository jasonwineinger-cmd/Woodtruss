import { validateLumberCatalog, type LumberCatalog } from "./catalog.js";

export interface PreliminaryStockOffer {
  offerId: string;
  referenceValueId: string;
  stockLengthIn: number;
  availablePieces: number;
  stockRecordId: string;
}

export interface SchematicMemberStockNeed {
  memberId: string;
  schematicRecordId: string;
  memberLengthIn: number;
  /** Total allowance entered by the planner; never inferred from geometry. */
  addedLengthIn: number;
  allowedReferenceValueIds: readonly string[];
  maxWidthIn: number;
  maxDepthIn: number;
}

const positive = (value: number) => Number.isFinite(value) && value > 0;
const text = (value: string) => typeof value === "string" && value.trim().length > 0;
const byId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
type Hold = "not-in-schematic-allowlist" | "exceeds-schematic-width" | "exceeds-schematic-depth" |
  "stock-too-short" | "no-pieces-in-reported-stock";

/** Independent per-member stock feasibility. No structural sizing, inventory
 * allocation, nesting, verified cost, or recommendation is made by this function. */
export function reviewPreliminaryStockFrontier(
  catalog: LumberCatalog, offers: readonly PreliminaryStockOffer[], needs: readonly SchematicMemberStockNeed[],
) {
  validateLumberCatalog(catalog);
  const references = new Map(catalog.records.map(row => [row.referenceValueId, row]));
  const offerIds = new Set<string>();
  for (const offer of offers) {
    if (!offer || !text(offer.offerId) || offerIds.has(offer.offerId) || !text(offer.stockRecordId) ||
      !references.has(offer.referenceValueId) || !positive(offer.stockLengthIn) ||
      !Number.isSafeInteger(offer.availablePieces) || offer.availablePieces < 0)
      throw new Error("Invalid or untraceable stock offer");
    offerIds.add(offer.offerId);
  }
  const memberIds = new Set<string>();
  for (const need of needs) {
    if (!need || !text(need.memberId) || memberIds.has(need.memberId) || !text(need.schematicRecordId) ||
      !positive(need.memberLengthIn) || !Number.isFinite(need.addedLengthIn) || need.addedLengthIn < 0 ||
      !positive(need.memberLengthIn + need.addedLengthIn) || !positive(need.maxWidthIn) || !positive(need.maxDepthIn) ||
      !Array.isArray(need.allowedReferenceValueIds) || need.allowedReferenceValueIds.length === 0 ||
      new Set(need.allowedReferenceValueIds).size !== need.allowedReferenceValueIds.length ||
      need.allowedReferenceValueIds.some(id => !references.has(id)))
      throw new Error("Missing or invalid explicit schematic member constraints");
    memberIds.add(need.memberId);
  }
  const members = [...needs].sort((a,b)=>byId(a.memberId,b.memberId)).map(need => {
    const requestedLengthIn = need.memberLengthIn + need.addedLengthIn;
    const candidates = [...offers].sort((a,b)=>byId(a.offerId,b.offerId)).map(offer => {
      const stock = references.get(offer.referenceValueId)!;
      const areaIn2 = stock.actualWidthIn * stock.actualDepthIn;
      if (!positive(areaIn2)) throw new Error("Invalid actual section area");
      const holds: Hold[] = [];
      if (!need.allowedReferenceValueIds.includes(offer.referenceValueId)) holds.push("not-in-schematic-allowlist");
      if (stock.actualWidthIn > need.maxWidthIn) holds.push("exceeds-schematic-width");
      if (stock.actualDepthIn > need.maxDepthIn) holds.push("exceeds-schematic-depth");
      if (offer.stockLengthIn < requestedLengthIn) holds.push("stock-too-short");
      if (offer.availablePieces === 0) holds.push("no-pieces-in-reported-stock");
      return { offerId:offer.offerId, stockRecordId:offer.stockRecordId, referenceValueId:stock.referenceValueId,
        actualWidthIn:stock.actualWidthIn, actualDepthIn:stock.actualDepthIn, reportedStockLengthIn:offer.stockLengthIn,
        reportedAvailablePieces:offer.availablePieces, areaIn2, holds, eligible:holds.length === 0,
        unusedLengthIn:offer.stockLengthIn >= requestedLengthIn ? offer.stockLengthIn - requestedLengthIn : null };
    });
    const eligible = candidates.filter(candidate => candidate.eligible);
    // Equal points stay visible. Dominance requires one strict improvement.
    const frontierOfferIds = eligible.filter(left => !eligible.some(right =>
      right.areaIn2 <= left.areaIn2 && right.unusedLengthIn! <= left.unusedLengthIn! &&
      (right.areaIn2 < left.areaIn2 || right.unusedLengthIn! < left.unusedLengthIn!),
    )).map(row=>row.offerId);
    return { memberId:need.memberId, schematicRecordId:need.schematicRecordId, requestedLengthIn,
      schematicConstraints: { memberLengthIn:need.memberLengthIn, addedLengthIn:need.addedLengthIn,
        maxWidthIn:need.maxWidthIn, maxDepthIn:need.maxDepthIn,
        allowedReferenceValueIds:[...need.allowedReferenceValueIds].sort(byId) },
      stockStatus: (frontierOfferIds.length ? "SCHEMATIC_OPTIONS_FOUND" :
        offers.length === 0 ? "HOLD_NO_REPORTED_STOCK" : "HOLD_NO_ELIGIBLE_STOCK"),
      candidates, frontierOfferIds };
  });
  return { status:"PRELIMINARY_NOT_ENGINEERED" as const, catalogId:catalog.catalogId, members,
    objectives:["actual-section-area", "unused-stock-length"] as const,
    approvedForStructuralUse:false as const, inventoryAllocated:false as const, approvedForFabrication:false as const,
    warnings:[
      "Eligibility is schematic fit and reported stock only; a frontier is not an approved material choice.",
      "Same stock may appear for several members. Inventory is not reserved, nested or priced.",
      "No NDS checks, allowable stresses, design capacities or fabrication authorization are supplied.",
    ] };
}
