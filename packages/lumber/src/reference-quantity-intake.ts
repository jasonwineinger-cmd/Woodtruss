import { validateLumberCatalog, type LumberCatalog, type LumberReference } from "./catalog.js";

const quantities = { Fb:"fbPsi", Ft:"ftPsi", Fc:"fcPsi", Fv:"fvPsi", E:"ePsi", Emin:"eMinPsi" } as const;
type Quantity = keyof typeof quantities;
type Artifact = { id:string; sha256:string };
export interface LumberPublicationIntake {
  publisher: string;
  edition: string;
  supplement: Artifact;
  /** Caller declares the exact consulted addenda, including explicit [] when none. */
  addenda: readonly Artifact[];
}
export interface LumberQuantityExpectation {
  quantity: Quantity;
  unit: "psi";
  /** Exact label recorded by the reviewer; not a prescribed axis or factor. */
  axisBasisId: string;
}
type StockIdentity = Pick<LumberReference,"referenceValueId" | "speciesGroup" | "grade" | "nominalSize" |
  "actualWidthIn" | "actualDepthIn" | "referencePublisher" | "referenceEdition" | "referenceTable">;
export interface LumberQuantityReceipt extends LumberQuantityExpectation {
  catalogId:string;
  stock:StockIdentity;
  publication:LumberPublicationIntake;
  /** Local check locator and private checked value. Neither is returned. */
  checkId:string;
  checkedValue:number;
}
const identityKeys = ["referenceValueId","speciesGroup","grade","nominalSize","actualWidthIn","actualDepthIn",
  "referencePublisher","referenceEdition","referenceTable"] as const;
const text=(v:unknown) => typeof v === "string" && v.trim().length > 0;
const hasQuantity=(q:string):q is Quantity => Object.hasOwn(quantities,q);
const hash=(v:unknown) => typeof v === "string" && /^[a-f0-9]{64}$/u.test(v) && !/^0{64}$/u.test(v);
const lexical=(a:string,b:string)=>a < b ? -1 : a > b ? 1 : 0;
function publicationKey(p?:LumberPublicationIntake) {
  if (!p || !text(p.publisher) || !text(p.edition) || !Array.isArray(p.addenda)) return null;
  const ordered=[p.supplement,...p.addenda];
  if (ordered.some(a=>!a || !text(a.id) || !hash(a.sha256)) ||
    new Set(ordered.map(a=>a.id)).size !== ordered.length || new Set(ordered.map(a=>a.sha256)).size !== ordered.length)
    return null;
  return JSON.stringify([p.publisher,p.edition,[p.supplement.id,p.supplement.sha256],
    [...p.addenda].sort((a,b)=>lexical(a.id,b.id)).map(({id,sha256})=>[id,sha256])]);
}

/** Cross-checks the complete chosen catalog row against caller-retained source receipts.
 * This does not fetch or independently verify evidence, define what a standard requires,
 * supply source values or material suitability, or imply engineering readiness. */
export function reviewLumberReferenceQuantityIntake(
  catalog:LumberCatalog, referenceValueId:string, publication:LumberPublicationIntake,
  expected:readonly LumberQuantityExpectation[], receipts:readonly LumberQuantityReceipt[],
) {
  validateLumberCatalog(catalog);
  const record=catalog.records.find(row=>row.referenceValueId === referenceValueId);
  const expectedByKind=new Map<Quantity,LumberQuantityExpectation>();
  for (const row of expected) {
    if (!row || !hasQuantity(row.quantity) || expectedByKind.has(row.quantity) ||
      row.unit !== "psi" || !text(row.axisBasisId)) throw new Error("Invalid or duplicate quantity expectation");
    expectedByKind.set(row.quantity,row);
  }
  const expectedPublication=publicationKey(publication);
  const holds:string[]=[];
  if (!record || !expectedPublication || record.referenceEdition !== publication.edition ||
    record.referencePublisher !== publication.publisher)
    holds.push("Selected catalog source or expected publisher, edition and Supplement/addenda artifacts do not match");
  const seen=new Set<Quantity>();
  const documented:Quantity[]=[];
  for (const receipt of receipts) {
    if (!receipt || !hasQuantity(receipt.quantity) || !expectedByKind.has(receipt.quantity)) {
      holds.push("Unknown quantity receipt");
      continue;
    }
    const q=receipt.quantity;
    if (seen.has(q)) {
      holds.push("Duplicate quantity receipt: "+q);
      continue;
    }
    seen.add(q);
    const target=expectedByKind.get(q)!;
    if (!record || !expectedPublication || receipt.catalogId !== catalog.catalogId || !receipt.stock ||
      !identityKeys.every(key=>receipt.stock[key] === record[key]) ||
      !text(receipt.checkId) || publicationKey(receipt.publication) !== expectedPublication ||
      receipt.unit !== target.unit || receipt.axisBasisId !== target.axisBasisId ||
      receipt.checkedValue !== record[quantities[q]]) holds.push("Stale source, quantity, unit, axis or stock evidence: "+q);
    else documented.push(q);
  }
  for (const q of Object.keys(quantities) as Quantity[]) {
    if (!expectedByKind.has(q)) holds.push("Missing explicit quantity expectation: "+q);
    else if (!seen.has(q)) holds.push("Missing quantity receipt: "+q);
  }
  return { documentationStatus:holds.length ? "HOLD_MISSING_OR_STALE_QUANTITY_EVIDENCE" as const : "DOCUMENTED_NOT_VERIFIED" as const,
    referenceValueId, documentedQuantities:holds.length ? [] : documented.sort(lexical), outstanding:holds.sort(lexical),
    sourceIndependentlyVerified:false as const, ndsReady:false as const, approvedForStructuralUse:false as const };
}
