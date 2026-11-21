import { validateLumberCatalog, type LumberCatalog, type LumberReference } from "./catalog.js";

/** Input documentation only. These topics are a project intake checklist, not
 * a complete or edition-specific list of NDS adjustment factors. */
const intakeTopics = ["load-duration", "moisture", "temperature", "size", "repetitive-member", "other-applicable"] as const;
type IntakeTopic = typeof intakeTopics[number];
export type LumberInputEvidence = {
  reference: {
    checkedCatalogId: string;
    /** Caller-attested copy from the independent check. Never returned to the UI. */
    checkedRecord: LumberReference;
    sourceDocumentSha256: string;
    independentCheckRecordId: string;
  };
  factorScope: {
    referenceEdition: string;
    referenceValueId: string;
    checkedReferenceRecordId: string;
    sourceDocumentSha256: string;
    reviewRecordId: string;
    notes: readonly { topic: IntakeTopic; evidenceRecordId: string }[];
  };
};
const referenceKeys = [
  "speciesGroup", "grade", "nominalSize", "actualWidthIn", "actualDepthIn",
  "referenceEdition", "referencePublisher", "referenceTable", "referenceValueId",
  "fbPsi", "ftPsi", "fcPsi", "fvPsi", "ePsi", "eMinPsi",
] as const;
const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

/** Fail closed for missing or stale documentation without implying the source
 * was authenticated or the applicability/factor values were engineered. */
export function assessLumberDesignInputEvidence(
  catalog: LumberCatalog,
  referenceValueId: string,
  evidence?: Partial<LumberInputEvidence>,
) {
  validateLumberCatalog(catalog);
  const selected = catalog.records.find(record => record.referenceValueId === referenceValueId);
  const outstanding: string[] = [];
  if (!selected) outstanding.push("Selected lumber reference is absent from the catalog");
  const reference = evidence?.reference;
  const hasBoundReference = !!selected && !!reference && reference.checkedCatalogId === catalog.catalogId &&
      !!reference.checkedRecord && referenceKeys.every(key => reference.checkedRecord[key] === selected[key]) &&
      hasText(reference.independentCheckRecordId) && typeof reference.sourceDocumentSha256 === "string" &&
      /^[a-f0-9]{64}$/u.test(reference.sourceDocumentSha256) && !/^0{64}$/u.test(reference.sourceDocumentSha256);
  if (!hasBoundReference) {
    outstanding.push("Independent source, edition and exact grade/stock/reference record evidence is missing or stale");
  }
  const scope = evidence?.factorScope;
  if (!selected || !hasBoundReference || !scope ||
      scope.checkedReferenceRecordId !== reference?.independentCheckRecordId ||
      scope.sourceDocumentSha256 !== reference?.sourceDocumentSha256 || scope.referenceEdition !== selected.referenceEdition ||
      scope.referenceValueId !== selected.referenceValueId || !hasText(scope.reviewRecordId) ||
      !Array.isArray(scope.notes)) {
    outstanding.push("Factor-scope documentation is not bound to the selected reference and edition");
  } else {
    const topics = new Set<unknown>();
    for (const note of scope.notes) {
      if (!note || !intakeTopics.some(topic => topic === note.topic) || topics.has(note.topic) || !hasText(note.evidenceRecordId)) {
        outstanding.push("Factor-scope documentation contains an invalid or duplicate intake topic");
        continue;
      }
      topics.add(note.topic);
    }
    for (const topic of intakeTopics) {
      if (!topics.has(topic)) outstanding.push("Missing intake evidence: " + topic);
    }
  }
  return {
    documentationStatus: (outstanding.length === 0 ? "DOCUMENTED_NOT_VERIFIED" : "HOLD_MISSING_OR_STALE_DOCUMENTATION") as
      "DOCUMENTED_NOT_VERIFIED" | "HOLD_MISSING_OR_STALE_DOCUMENTATION",
    outstanding,
    ndsReady: false as const,
    approvedForStructuralUse: false as const,
  };
}
