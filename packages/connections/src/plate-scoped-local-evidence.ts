import { reviewDatedLocalPlateReport, type DatedLocalPlateReportReviewInput } from "./plate-dated-local-report-review.js";
import { reviewPlateIdentificationReferenceEvidence, type PlateIdentificationReferenceEvidence } from "./plate-identification-reference-evidence.js";
import { reviewPlateResistanceBasisEvidence, type PlateResistanceBasisEvidence } from "./plate-resistance-basis-evidence.js";

export type ScopedPlateReportEvidenceInput = DatedLocalPlateReportReviewInput & {
  expectedResistance: PlateResistanceBasisEvidence;
  observedResistance: PlateResistanceBasisEvidence;
  expectedIdentification: PlateIdentificationReferenceEvidence;
  observedIdentification: PlateIdentificationReferenceEvidence;
};

function result(outstanding: string[]) {
  return {
    status: outstanding.length ? "HOLD_SCOPED_PLATE_REPORT" as const : "SCOPED_PLATE_REPORT_REVIEW_ONLY" as const,
    outstanding,
    issuerStatusVerified: false as const,
    manufacturerAuthenticated: false as const,
    applicabilityVerified: false as const,
    capacityVerified: false as const,
    engineeringApproved: false as const,
    fabricationAuthorized: false as const,
    machineReleaseAuthorized: false as const,
  };
}

/** Reconcile two separately authored metadata checks and exact local bytes.
 * No product-specific method whitelist, process claims, capacity values, or
 * approval. An index box reference is not the underlying product report. */
export async function reviewScopedPlateReportEvidence(input: ScopedPlateReportEvidenceInput) {
  try {
    const { expectedReference, expectedResistance, observedResistance, expectedIdentification, observedIdentification } = input;
    const basis = reviewPlateResistanceBasisEvidence(expectedResistance, observedResistance);
    const identification = reviewPlateIdentificationReferenceEvidence(expectedIdentification, observedIdentification);
    if (basis.status !== "BASIS_MATCH_REVIEW_ONLY" || identification.status !== "IDENTIFICATION_MATCH_REVIEW_ONLY")
      return result([...basis.outstanding, ...identification.outstanding]);
    const { identity, basis: use } = expectedReference;
    const selection = expectedResistance;
    if (selection.documentId !== identity.documentId || selection.digestSha256 !== identity.digestSha256 ||
        selection.productCode !== identity.productCode || selection.locator !== identity.locator ||
        selection.family !== identity.family || selection.faces !== use.faces ||
        (selection.mechanism === "tooth-lateral" && selection.sectionBasis !== use.areaBasis) ||
        expectedIdentification.manufacturer !== identity.manufacturer ||
        expectedIdentification.productCode !== identity.productCode ||
        expectedIdentification.productEvaluationReportId !== identity.documentId ||
        expectedIdentification.productEvaluationDigestSha256 !== identity.digestSha256)
      return result(["Resistance basis, product mark and box evidence must identify the same exact scoped product report"]);
    const local = await reviewDatedLocalPlateReport(input);
    return local.status === "DOCUMENTED_DATED_LOCAL_REPORT_ONLY" ? result([]) : result(local.outstanding);
  } catch {
    return result(["Malformed or uncheckable scoped plate report evidence"]);
  }
}
