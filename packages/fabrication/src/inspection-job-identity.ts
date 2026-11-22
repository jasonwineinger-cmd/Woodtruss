export interface InspectionJobIdentity {
  jobId: string;
  trussId: string;
  designRevision: string;
  designArtifactSha256: string;
  plantRecordId: string;
  lineSetupId: string;
  shiftId: string;
}

const keys = ["jobId", "trussId", "designRevision", "designArtifactSha256", "plantRecordId", "lineSetupId", "shiftId"] as const;
const text = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 512 &&
  value.trim() === value && !/\p{Cc}/u.test(value);

function parse(value: unknown): InspectionJobIdentity | null {
  if (!value || typeof value !== "object") return null;
  const proto = Object.getPrototypeOf(value);
  if ((proto !== Object.prototype && proto !== null) || Reflect.ownKeys(value).length !== keys.length) return null;
  const entries: [typeof keys[number], string][] = [];
  for (const key of keys) {
    const field = Object.getOwnPropertyDescriptor(value, key);
    if (!field?.enumerable || !Object.hasOwn(field, "value") || !text(field.value)) return null;
    if (key === "designArtifactSha256" && (field.value.length !== 64 ||
        !/^[a-f0-9]{64}$/u.test(field.value) || /^0{64}$/u.test(field.value))) return null;
    entries.push([key, field.value]);
  }
  return Object.fromEntries(entries) as unknown as InspectionJobIdentity;
}

/** Exact review-only comparison of caller-provided job identity records.
 * A match verifies neither credentials, artifact bytes nor physical work. */
export function compareInspectionJobIdentity(expected: unknown, observed: unknown) {
  const outstanding: string[] = [];
  let a: InspectionJobIdentity | null = null;
  let b: InspectionJobIdentity | null = null;
  try { a = parse(expected); } catch { /* reflection failures hold */ }
  try { b = parse(observed); } catch { /* reflection failures hold */ }
  if (!a || !b) outstanding.push("Expected and observed job identities must both be complete and well formed.");
  if (a && b && !keys.every(key => a[key] === b[key])) {
    outstanding.push("Observed job identity does not match the expected job identity.");
  }
  return {
    status: outstanding.length ? "HOLD_JOB_IDENTITY" as const : "JOB_IDENTITY_MATCH_ONLY" as const,
    outstanding, plantCredentialVerified: false as const, physicalInspectionVerified: false as const,
    fabricationAuthorized: false as const,
  };
}
