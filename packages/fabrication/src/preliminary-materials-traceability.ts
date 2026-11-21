import {createPreliminaryMaterialsReport, type PreliminaryMaterialsReport} from "./preliminary-materials.js";
import {parsePreliminaryMaterialsSnapshot} from "./preliminary-materials-revisions.js";

export interface ExpectedPreliminaryMaterialsIdentity {
  readonly designId: string;
  readonly revisionId: string;
  /** Trusted digest of the source model's schematic geometry, not proof of engineering or release. */
  readonly sourceGeometrySha256: string;
}

export interface PreliminaryMaterialsTraceabilityManifest extends ExpectedPreliminaryMaterialsIdentity {
  readonly schemaVersion: "woodtruss.preliminary-materials-traceability.v1";
  readonly status: "PRELIMINARY_NOT_ENGINEERED";
  readonly notice: "NOT FOR FABRICATION";
  readonly fabricationAuthorized: false;
  readonly identityBasis: "CANONICAL_INCH_JOINTS_AND_DIRECTED_MEMBER_ENDPOINTS_V1";
}

type ModelGeometry = Parameters<typeof createPreliminaryMaterialsReport>[2];

async function geometrySha256(report: PreliminaryMaterialsReport): Promise<string> {
  // Positional JSON arrays specify the byte format independently of object-property ordering.
  const text = JSON.stringify([
    "woodtruss.schematic-model-geometry.v1", "in",
    report.joints.map(j => [j.jointId, j.xIn, j.yIn]),
    report.members.map(m => [m.memberId, ...m.endJointIds]),
  ]);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
}

/** Derive the expected geometry identity independently of the snapshot to be checked.
 * Analysis loads, support restraints, lumber and approval evidence are outside this identity.
 */
export async function fingerprintPreliminaryMaterialsSource(model: ModelGeometry): Promise<string> {
  return geometrySha256(createPreliminaryMaterialsReport("source-geometry", "fingerprint", model));
}

export async function createPreliminaryMaterialsTraceabilityManifest(
  snapshot: unknown,
): Promise<PreliminaryMaterialsTraceabilityManifest> {
  const report = parsePreliminaryMaterialsSnapshot(snapshot);
  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-materials-traceability.v1",
    designId: report.designId,
    revisionId: report.revisionId,
    sourceGeometrySha256: await geometrySha256(report),
    status: "PRELIMINARY_NOT_ENGINEERED",
    notice: "NOT FOR FABRICATION",
    fabricationAuthorized: false,
    identityBasis: "CANONICAL_INCH_JOINTS_AND_DIRECTED_MEMBER_ENDPOINTS_V1",
  });
}

/** Fail closed on unrecognized manifests, substitutions, or expected-identity mismatches.
 * The expected identity must come from trusted caller state, not from the package being verified.
 */
export async function verifyPreliminaryMaterialsTraceability(
  snapshot: unknown, manifest: unknown, expected: ExpectedPreliminaryMaterialsIdentity,
): Promise<PreliminaryMaterialsTraceabilityManifest> {
  // Capture caller expectations before the digest yield; never echo any caller-supplied fields.
  const {designId, revisionId, sourceGeometrySha256} = expected;
  if (typeof sourceGeometrySha256 !== "string" || !/^[0-9a-f]{64}$/u.test(sourceGeometrySha256))
    throw new Error("Expected a trusted source geometry SHA-256");
  if (!manifest || typeof manifest !== "object" || Object.getPrototypeOf(manifest) !== Object.prototype)
    throw new Error("Expected a preliminary materials traceability JSON record");
  const fields = Object.getOwnPropertyDescriptors(manifest);
  const canonical = await createPreliminaryMaterialsTraceabilityManifest(snapshot);
  const keys = Object.keys(canonical) as Array<keyof PreliminaryMaterialsTraceabilityManifest>;
  if (Reflect.ownKeys(fields).length !== keys.length ||
      !keys.every(key => Object.hasOwn(fields, key) && Object.hasOwn(fields[key], "value") && fields[key].value === canonical[key]))
    throw new Error("Traceability manifest does not match the canonical preliminary snapshot");
  if (canonical.designId !== designId || canonical.revisionId !== revisionId)
    throw new Error("Unexpected preliminary materials design or revision");
  if (canonical.sourceGeometrySha256 !== sourceGeometrySha256)
    throw new Error("Unexpected preliminary materials source geometry");
  return canonical;
}
