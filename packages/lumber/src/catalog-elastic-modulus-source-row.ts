type CatalogModulusScope = {
  assignmentRecordId: string;
  modelId: string;
  modelRevision: string;
  memberId: string;
  startNodeId: string;
  endNodeId: string;
  bendingAxis: "about-width" | "about-depth";
  catalogId: string;
  referenceValueId: string;
  quantity: "E" | "Emin";
  publisher: string;
  edition: string;
  table: string;
  speciesGroup: string;
  grade: string;
  nominalSize: string;
  actualWidthIn: number;
  actualDepthIn: number;
  valuePsi: number;
};

const textScope = ["assignmentRecordId", "modelId", "modelRevision", "memberId", "startNodeId", "endNodeId", "catalogId", "referenceValueId", "publisher", "edition",
  "table", "speciesGroup", "grade", "nominalSize"] as const;
const numberScope = ["actualWidthIn", "actualDepthIn"] as const;
const scopeKeys = [...textScope, ...numberScope, "quantity", "bendingAxis"] as const;
const artifactKeys = ["sourceRole", "sourceArtifactId", "sourceArtifactSha256"] as const;
const expectedKeys = [...scopeKeys, ...artifactKeys] as const;
const receiptKeys = [...expectedKeys, "checkedValuePsi"] as const;
const text = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 512 &&
  value.trim() === value && !/\p{Cc}/u.test(value);
const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
function exact<K extends string>(value: unknown, keys: readonly K[]): value is Record<K, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Reflect.ownKeys(value).length === keys.length &&
    keys.every(key => {
      const field = Object.getOwnPropertyDescriptor(value, key);
      return !!field?.enumerable && Object.hasOwn(field, "value");
    });
}

/** Check one declared Supplement row against one exact assignment scope.
 * Equality alone does not verify the publication, values, or structural use. */
export function catalogElasticModulusSourceRowMatches(
  expected: unknown, receipt: unknown, scope: CatalogModulusScope,
): boolean {
  try {
    if (!exact(expected, expectedKeys) || !exact(receipt, receiptKeys) ||
        !textScope.every(key => text(expected[key])) || !numberScope.every(key => positive(expected[key])) ||
        (expected.quantity !== "E" && expected.quantity !== "Emin") ||
        (expected.bendingAxis !== "about-width" && expected.bendingAxis !== "about-depth") ||
        (expected.sourceRole !== "nds-supplement" && expected.sourceRole !== "nds-supplement-update") ||
        !text(expected.sourceArtifactId) || typeof expected.sourceArtifactSha256 !== "string" ||
        expected.sourceArtifactSha256.length !== 64 || !/^[a-f0-9]{64}$/u.test(expected.sourceArtifactSha256) ||
        /^0{64}$/u.test(expected.sourceArtifactSha256) ||
        !scopeKeys.every(key => expected[key] === scope[key]) ||
        !expectedKeys.every(key => expected[key] === receipt[key])) return false;
    return positive(scope.valuePsi) && receipt.checkedValuePsi === scope.valuePsi;
  } catch {
    return false;
  }
}
