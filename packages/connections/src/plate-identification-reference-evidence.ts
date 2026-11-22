export interface PlateIdentificationReferenceEvidence {
  manufacturer: string;
  productCode: string;
  embossedCode: string;
  boxReferenceId: string;
  boxReferenceRole: "product-evaluation-report" | "issuer-index";
  productEvaluationReportId: string;
  productEvaluationDigestSha256: string;
}

const keys = ["manufacturer", "productCode", "embossedCode", "boxReferenceId", "boxReferenceRole",
  "productEvaluationReportId", "productEvaluationDigestSha256"] as const;
const text = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 512 &&
  value.trim() === value && !/[\u0000-\u001f\u007f]/u.test(value);

function parse(value: unknown): PlateIdentificationReferenceEvidence | null {
  if (!value || typeof value !== "object") return null;
  const proto = Object.getPrototypeOf(value);
  if ((proto !== Object.prototype && proto !== null) || Reflect.ownKeys(value).length !== keys.length) return null;
  const entries = [];
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value") || !text(descriptor.value)) return null;
    entries.push([key, descriptor.value]);
  }
  const row = Object.fromEntries(entries) as PlateIdentificationReferenceEvidence;
  const digest = row.productEvaluationDigestSha256;
  if (digest.length !== 64 || !/^[a-f0-9]{64}$/u.test(digest) || /^0{64}$/u.test(digest)) return null;
  const sameId = row.boxReferenceId === row.productEvaluationReportId;
  if (row.boxReferenceRole === "product-evaluation-report" ? !sameId :
    row.boxReferenceRole !== "issuer-index" || sameId) return null;
  return row;
}

/** Compare only independently expected and observed plain metadata under the
 * caller's explicit reference-role distinction. No issuer lookup, product
 * identification authentication, report applicability or design endorsement. */
export function reviewPlateIdentificationReferenceEvidence(expected: unknown, observed: unknown) {
  let expectedRow: PlateIdentificationReferenceEvidence | null = null;
  let observedRow: PlateIdentificationReferenceEvidence | null = null;
  try { expectedRow = parse(expected); } catch { /* reflection failure holds */ }
  try { observedRow = parse(observed); } catch { /* reflection failure holds */ }
  const outstanding: string[] = [];
  if (!expectedRow) outstanding.push("Expected plate identification evidence is missing, malformed, or has conflicting reference roles.");
  if (!observedRow) outstanding.push("Observed plate identification evidence is missing, malformed, or has conflicting reference roles.");
  if (expectedRow && observedRow) {
    for (const key of keys) {
      if (expectedRow[key] !== observedRow[key]) outstanding.push(`Plate identification differs: ${key}`);
    }
  }
  return {
    status: outstanding.length ? "HOLD_PRODUCT_IDENTIFICATION" as const : "IDENTIFICATION_MATCH_REVIEW_ONLY" as const,
    outstanding, manufacturerAuthenticated: false as const, productVerified: false as const,
    capacityVerified: false as const, fabricationAuthorized: false as const,
  };
}
