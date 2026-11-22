import { snapshotElasticFrameReviewData } from "../../analysis/src/elastic-frame-reviewed-plain-data.js";
import { inspectionPrivateBytesMatch } from "./inspection-private-byte-digest.js";
import { reviewJobTrussInspectionIntake, type JobTrussInspectionIntake } from "./job-truss-inspection-intake.js";

const dataId = (value: unknown): value is string => typeof value === "string" &&
  value.length > 0 && value.length <= 240 && value.trim() === value && !/[\u0000-\u001f\u007f]/u.test(value);

function snapshotRecord<K extends string>(value: unknown, keys: readonly K[]): Record<K, unknown> {
  if (!value || typeof value !== "object") throw new Error("Expected an exact record");
  const prototype = Object.getPrototypeOf(value);
  if ((prototype !== Object.prototype && prototype !== null) || Reflect.ownKeys(value).length !== keys.length)
    throw new Error("Expected only declared fields");
  const out = Object.create(null) as Record<K, unknown>;
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) throw new Error("Expected an own data field");
    out[key] = descriptor.value;
  }
  return out;
}

const hold = (outstanding: string[]) => ({
  status: "HOLD_JOB_TRUSS_INSPECTION_INTAKE" as const,
  outstanding,
  designArtifactBytesMatch: false as const,
  inspectionRecordBytesMatch: false as const,
  plantCredentialVerified: false as const,
  signatureVerified: false as const,
  physicalInspectionVerified: false as const,
  repairClosureVerified: false as const,
  structuralAdequacyVerified: false as const,
  shippingAuthorized: false as const,
  fabricationAuthorized: false as const,
  machineReleaseAuthorized: false as const,
});

/** Independently expected document roles in one documentary intake, matched
 * as a pair against exact private local byte views. No file is inspected,
 * fetched, decoded or trusted, and no authorization follows from byte identity. */
export async function reviewJobTrussInspectionPairedArtifactBytes(input: unknown) {
  try {
    const request = snapshotRecord(input, ["intake", "expectedDesignArtifactId", "designArtifact", "inspectionArtifact"]);
    const design = snapshotRecord(request.designArtifact, ["designArtifactId", "designRevision", "bytes"]);
    const inspection = snapshotRecord(request.inspectionArtifact, ["inspectionRecordId", "designRevision", "bytes"]);
    const intake = snapshotElasticFrameReviewData(request.intake) as JobTrussInspectionIntake;
    const documentary = reviewJobTrussInspectionIntake(intake);
    if (documentary.status !== "DOCUMENTED_JOB_TRUSS_REVIEW_ONLY") return hold(documentary.outstanding);

    const { identity, record } = intake.expected;
    const designId = request.expectedDesignArtifactId;
    if (!dataId(designId) || designId === record.inspectionRecordId || designId === record.signatureRecordId ||
        design.designArtifactId !== designId || inspection.inspectionRecordId !== record.inspectionRecordId ||
        design.designRevision !== identity.designRevision || inspection.designRevision !== identity.designRevision) {
      return hold(["Local artifact roles must match the distinct expected document IDs and the exact design revision"]);
    }
    // Each helper takes custody of its selected view synchronously, so both
    // snapshots and every identity check happen before our first suspension.
    const designMatch = inspectionPrivateBytesMatch(identity.designArtifactSha256, design.bytes);
    const inspectionMatch = inspectionPrivateBytesMatch(record.signedRecordSha256, inspection.bytes);
    const [designOk, inspectionOk] = await Promise.all([designMatch, inspectionMatch]);
    if (!designOk || !inspectionOk) return hold(["The local artifact pair does not match the independently expected digests"]);

    return {
      ...documentary,
      status: "JOB_TRUSS_PAIRED_ARTIFACT_BYTES_MATCH_ONLY" as const,
      designArtifactBytesMatch: true as const,
      inspectionRecordBytesMatch: true as const,
    };
  } catch {
    return hold(["Malformed or uncheckable private artifact pair scope"]);
  }
}
