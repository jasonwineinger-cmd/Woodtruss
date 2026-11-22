import { snapshotElasticFrameReviewData } from "../../analysis/src/elastic-frame-reviewed-plain-data.js";
import { inspectionPrivateBytesMatch } from "./inspection-private-byte-digest.js";
import { compareInspectionJobIdentity, type InspectionJobIdentity } from "./inspection-job-identity.js";
import { reviewPairedFaceInspectionEvidence, type InspectionDetailedFace, type InspectionJointExpectation,
  type InspectionPreliminaryFace } from "./paired-face-inspection-evidence.js";

interface InspectionRecordIdentity {
  inspectionRecordId: string;
  signedRecordSha256: string;
  signatureRecordId: string;
}
export interface JobTrussInspectionIntake {
  expected: {
    identity: InspectionJobIdentity;
    record: InspectionRecordIdentity;
    criticalJoints: readonly InspectionJointExpectation[];
  };
  supplied: {
    identity: InspectionJobIdentity;
    record: InspectionRecordIdentity;
    correctionStatus: "none-required" | "open" | "reported-closed";
    preliminary: readonly InspectionPreliminaryFace[];
    detailed: readonly InspectionDetailedFace[];
  };
}
const dataId = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 240 &&
  value.trim() === value && !/[\u0000-\u001f\u007f]/u.test(value);
const digest = (value: unknown) => typeof value === "string" && value.length === 64 && /^[a-f0-9]{64}$/u.test(value) && !/^0{64}$/u.test(value);
function exactRecord(value: unknown, keys: readonly string[]) {
  if (!value || typeof value !== "object" || Reflect.ownKeys(value).length !== keys.length) return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) && keys.every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable && Object.hasOwn(descriptor, "value");
  });
}
function result(outstanding: string[]) {
  return {
    status: outstanding.length ? "HOLD_JOB_TRUSS_INSPECTION_INTAKE" as const : "DOCUMENTED_JOB_TRUSS_REVIEW_ONLY" as const,
    outstanding,
    plantCredentialVerified: false as const,
    signatureVerified: false as const,
    physicalInspectionVerified: false as const,
    repairClosureVerified: false as const,
    structuralAdequacyVerified: false as const,
    shippingAuthorized: false as const,
    fabricationAuthorized: false as const,
    machineReleaseAuthorized: false as const,
  };
}

/** Documentation gate for one explicitly identified job/truss, revision and
 * independently expected detailed joint set. It never reads an inspection
 * form or a signature; supplied record identifiers are documentary only. */
export function reviewJobTrussInspectionIntake(input: JobTrussInspectionIntake) {
  try {
    if (!exactRecord(input, ["expected", "supplied"])) return result(["Malformed inspection documentation scope"]);
    const { expected, supplied } = input;
    if (!exactRecord(expected, ["identity", "record", "criticalJoints"]) ||
        !exactRecord(supplied, ["identity", "record", "correctionStatus", "preliminary", "detailed"]))
      return result(["Malformed inspection documentation scope"]);
    const job = compareInspectionJobIdentity(expected.identity, supplied.identity);
    if (job.status !== "JOB_IDENTITY_MATCH_ONLY") return result(job.outstanding);
    const ownValue = (row: object, key: string) => {
      const descriptor = Object.getOwnPropertyDescriptor(row, key);
      return descriptor?.enumerable && Object.hasOwn(descriptor, "value") ? descriptor.value as unknown : undefined;
    };
    const record = (row: InspectionRecordIdentity) => {
      if (!row || (Object.getPrototypeOf(row) !== Object.prototype && Object.getPrototypeOf(row) !== null) ||
          Reflect.ownKeys(row).length !== 3) return null;
      const id = ownValue(row, "inspectionRecordId"), sha = ownValue(row, "signedRecordSha256"),
        signature = ownValue(row, "signatureRecordId");
      return dataId(id) && dataId(signature) && digest(sha) && id !== signature ? { id, sha, signature } : null;
    };
    const a = record(expected.record), b = record(supplied.record);
    if (!a || !b || a.id !== b.id || a.sha !== b.sha || a.signature !== b.signature ||
        a.sha === expected.identity.designArtifactSha256)
      return result(["Separate exact inspection record and signature references must match the independent scope"]);
    if (supplied.correctionStatus !== "none-required")
      return result(["Corrections remain held: a reported closure is not independent reinspection evidence"]);
    const faces = reviewPairedFaceInspectionEvidence(expected.criticalJoints, supplied.preliminary, supplied.detailed);
    return faces.status === "PAIRED_FACE_DOCUMENTATION_MATCH_ONLY" ? result([]) : result(faces.outstanding);
  } catch {
    return result(["Malformed or uncheckable inspection documentation"]);
  }
}

/** Match one local byte view to an independently expected record ID, design
 * revision and digest after the documentary gate. No record is parsed, fetched
 * or trusted. Byte agreement is not signature or inspection verification. */
export async function reviewJobTrussInspectionRecordBytes(input: unknown) {
  const hold = (outstanding: string[]) => ({ ...result(outstanding), inspectionRecordBytesMatch: false as const });
  const own = (value: object, key: string) => Object.getOwnPropertyDescriptor(value, key)?.value as unknown;
  try {
    if (!exactRecord(input, ["intake", "artifact"])) return hold(["Malformed private inspection byte scope"]);
    const request = input as object;
    const rawIntake = own(request, "intake");
    const artifact = own(request, "artifact");
    if (!exactRecord(artifact, ["inspectionRecordId", "designRevision", "bytes"]))
      return hold(["A local inspection byte view and exact declared record and revision are required"]);
    const supplied = artifact as object;
    const inspectionRecordId = own(supplied, "inspectionRecordId");
    const designRevision = own(supplied, "designRevision");
    const bytes = own(supplied, "bytes");
    // Use the same bounded, detached plain-data snapshot for documentary
    // validation and bindings. Raw reflection is not an external trust boundary.
    const intake = snapshotElasticFrameReviewData(rawIntake) as JobTrussInspectionIntake;
    const documentary = reviewJobTrussInspectionIntake(intake);
    if (documentary.status !== "DOCUMENTED_JOB_TRUSS_REVIEW_ONLY") return hold(documentary.outstanding);
    if (inspectionRecordId !== intake.expected.record.inspectionRecordId ||
        designRevision !== intake.expected.identity.designRevision)
      return hold(["Private inspection bytes must identify the exact independently expected record and design revision"]);
    if (!await inspectionPrivateBytesMatch(intake.expected.record.signedRecordSha256, bytes))
      return hold(["Private inspection bytes could not be matched to the independently expected local digest"]);
    return { ...documentary, status: "JOB_TRUSS_INSPECTION_RECORD_BYTES_MATCH_ONLY" as const,
      inspectionRecordBytesMatch: true as const };
  } catch {
    return hold(["Malformed or uncheckable private inspection byte scope"]);
  }
}
