import type { PlateReferenceEvidence } from "./plate-reference-evidence.js";
import { verifyLocalPlateSourceArtifact, type AuthorizedPlateSourceArtifact } from "./plate-source-artifact.js";
import { inspectPlateReportObservationWindow, type PlateReportObservation } from "./plate-report-observation-window.js";

export interface DatedLocalPlateReportReviewInput {
  expectedReference: PlateReferenceEvidence;
  expectedReport: PlateReportObservation;
  authorization: AuthorizedPlateSourceArtifact | null;
  reviewDate: string;
  supplied: { reference: PlateReferenceEvidence; report: PlateReportObservation; bytes?: Uint8Array };
}

function result(outstanding: string[]) {
  return {
    status: outstanding.length ? "HOLD_DATED_LOCAL_REPORT" as const : "DOCUMENTED_DATED_LOCAL_REPORT_ONLY" as const,
    outstanding,
    issuerStatusVerified: false as const,
    manufacturerSourceAuthenticated: false as const,
    applicabilityVerified: false as const,
    capacityVerified: false as const,
    engineeringApproved: false as const,
    fabricationAuthorized: false as const,
    machineReleaseAuthorized: false as const,
  };
}

/** Compare one caller-dated issuer observation with independently expected
 * reference metadata and the exact separately authorized local artifact.
 * Neither a dated attestation nor a byte match authenticates a publisher
 * or verifies a product, capacity, installation, or independent approval. */
export async function reviewDatedLocalPlateReport(input: DatedLocalPlateReportReviewInput) {
  try {
    const { expectedReference, expectedReport, authorization, reviewDate, supplied } = input;
    const { report, matched } = inspectPlateReportObservationWindow(expectedReport, supplied.report, reviewDate);
    if (!matched) return result(report.outstanding);
    const { issuer, documentId, productCode, digestSha256, revisedMonth } = expectedReference.identity;
    if (matched.issuer !== issuer || matched.documentId !== documentId ||
        matched.productCode !== productCode || matched.digestSha256 !== digestSha256 ||
        matched.revisedMonth !== revisedMonth)
      return result(["Dated issuer information does not identify the same expected product report and revision"]);
    const bytes = supplied.bytes;
    const buffer = bytes instanceof Uint8Array ? bytes.buffer : null;
    if (!(buffer instanceof ArrayBuffer)) return result(["Exact non-shared local report bytes are required"]);
    const artifact = await verifyLocalPlateSourceArtifact(expectedReference, authorization,
      { reference: supplied.reference, bytes });
    if (artifact.status !== "EXACT_ARTIFACT_REVIEW_ONLY")
      return result(["The exact separately authorized local report and reference metadata did not match"]);
    return result([]);
  } catch {
    return result(["Invalid or uncheckable dated local report"]);
  }
}
