import type { LumberCatalog } from "./catalog.js";
import { assessLumberDesignInputEvidence, type LumberInputEvidence } from "./design-readiness.js";
import { reviewLumberEditionPrivateBytes } from "./edition-private-artifact-bytes.js";
import { inspectLumberEditionPublicationPair, type LumberEditionPublicationPair } from "./edition-publication-pair.js";
import type { PrivateLumberPublicationArtifact } from "./publication-byte-evidence.js";
import { reviewLumberReferenceQuantityIntake, type LumberPublicationIntake, type LumberQuantityExpectation,
  type LumberQuantityReceipt } from "./reference-quantity-intake.js";

export type EditionBoundLumberQuantityExpectation = LumberQuantityExpectation & { sourceArtifactId: string };
export type EditionBoundLumberQuantityReceipt = LumberQuantityReceipt & { sourceArtifactId: string };
export interface EditionBoundLumberIntake {
  catalog: LumberCatalog;
  referenceValueId: string;
  /** Declared observed publication inventory, checked stock row and factor intake. */
  evidence: LumberInputEvidence;
  /** Obtain this and the quantity expectations independently of the receipt being checked. */
  expectedPublicationPair: LumberEditionPublicationPair;
  expectedQuantities: readonly EditionBoundLumberQuantityExpectation[];
  receipts: readonly EditionBoundLumberQuantityReceipt[];
  privateArtifacts: readonly PrivateLumberPublicationArtifact[];
}

function result(outstanding: string[], quantities: readonly LumberQuantityExpectation["quantity"][] = []) {
  return {
    documentationStatus: outstanding.length > 0 ? "HOLD_EDITION_BOUND_INTAKE" as const
      : "DOCUMENTED_AND_ROLE_BYTES_MATCH_NOT_VERIFIED" as const,
    documentedQuantities: outstanding.length > 0 ? [] : [...quantities],
    outstanding,
    publisherVerified: false as const,
    licensedAuthorizationVerified: false as const,
    ndsReady: false as const,
    approvedForStructuralUse: false as const,
  };
}

/** Compares supplied local bytes and exact documentary receipts. This does not
 * check table content against the byte files, authorize their use, or apply a
 * design rule. Expected identities and row-level source assignments must be
 * supplied separately by the caller; equality cannot authenticate them. */
export async function reviewLumberIntakeWithEditionEvidence(input: EditionBoundLumberIntake) {
  try {
    const { catalog, referenceValueId, evidence, expectedPublicationPair, expectedQuantities, receipts, privateArtifacts } = input;
    if (!evidence?.publicationPair) return result(["Observed edition and publication roles are missing"]);
    const { report, matchedInventory } = inspectLumberEditionPublicationPair(expectedPublicationPair, evidence.publicationPair);
    if (!matchedInventory) return result(report.outstanding);
    const stockAndFactors = assessLumberDesignInputEvidence(catalog, referenceValueId,
      { reference: evidence.reference, factorScope: evidence.factorScope, publicationPair: matchedInventory }, matchedInventory);
    if (stockAndFactors.documentationStatus !== "DOCUMENTED_NOT_VERIFIED") return result(stockAndFactors.outstanding);
    const { ruleEdition, publisher, nds, supplement, ndsUpdates, supplementUpdates } = matchedInventory;
    const supplementIds = new Set([supplement, ...supplementUpdates].map(artifact => artifact.id));
    if (!Array.isArray(expectedQuantities) || !Array.isArray(receipts) ||
        expectedQuantities.length !== 6 || receipts.length !== 6) {
      return result(["Supply the complete set of six traceable quantity expectations and receipts"]);
    }
    const expectedSourceByQuantity = new Map<LumberQuantityExpectation["quantity"], string>();
    for (const row of expectedQuantities) {
      if (!row || expectedSourceByQuantity.has(row.quantity) || !supplementIds.has(row.sourceArtifactId))
        return result(["Each expected quantity must cite its exact paired Supplement or Supplement update"]);
      expectedSourceByQuantity.set(row.quantity, row.sourceArtifactId);
    }
    for (const row of receipts) {
      if (!row || !supplementIds.has(row.sourceArtifactId) || expectedSourceByQuantity.get(row.quantity) !== row.sourceArtifactId)
        return result(["A private quantity receipt cites a different source artifact or publication role"]);
    }
    const publication: LumberPublicationIntake = { publisher, edition: ruleEdition, supplement, addenda: supplementUpdates };
    const quantity = reviewLumberReferenceQuantityIntake(catalog, referenceValueId, publication, expectedQuantities, receipts);
    if (quantity.documentationStatus !== "DOCUMENTED_NOT_VERIFIED")
      return result(["The complete Supplement quantity receipts do not match the scoped stock and publication evidence"]);

    // The matched inventory contains detached identities from the independent expectation.
    // No private values or locators are returned; all six are held if any byte proof fails.
    const expectedBytes = [nds, ...ndsUpdates, supplement, ...supplementUpdates].map(({ id, sha256 }) => ({ id, sha256 }));
    const bytes = await reviewLumberEditionPrivateBytes(expectedBytes, privateArtifacts);
    return bytes.matches ? result([], quantity.documentedQuantities)
      : result(bytes.outstanding.length > 0 ? bytes.outstanding : ["Private publication bytes were not matched"]);
  } catch {
    return result(["Malformed or uncheckable edition-bound lumber intake"]);
  }
}
