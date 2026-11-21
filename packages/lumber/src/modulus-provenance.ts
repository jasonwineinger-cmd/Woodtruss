import type { LoadEnvelope } from "../../analysis/src/envelope.js";
import { validateLumberCatalog, type LumberCatalog } from "./catalog.js";
import { studyPreliminaryAxialStability, type AxialStabilityStudyInput } from "./axial-stability-study.js";

/** Metadata for locally checked material, not a copy of a licensed publication. */
export type LumberModulusPublication = { edition: string; supplementSha256: string; addendumId: string; addendumSha256: string };
type ColumnEvidence = {
  column: "E" | "Emin";
  /** Private checked value supplied for comparison only; never serialized by this function. */
  checkedValuePsi: number;
  publication: LumberModulusPublication;
  checkId: string;
};
export interface LumberModulusEvidence {
  catalogId: string;
  referenceValueId: string;
  publisher: string;
  table: string;
  speciesGroup: string;
  grade: string;
  nominalSize: string;
  actualWidthIn: number;
  actualDepthIn: number;
  mean: ColumnEvidence;
  minimum: ColumnEvidence;
}

const text = (item: unknown) => typeof item === "string" && item.trim().length > 0;
const hash = (item: unknown) => typeof item === "string" && /^[0-9a-f]{64}$/u.test(item) && !/^0{64}$/u.test(item);
const samePublication = (a: LumberModulusPublication | undefined, b: LumberModulusPublication) => !!a &&
  a.edition === b.edition && a.supplementSha256 === b.supplementSha256 &&
  a.addendumId === b.addendumId && a.addendumSha256 === b.addendumSha256;

/** Optional guarded intake for a study specifically claiming documented modulus provenance.
 * Legacy preliminary capability is unchanged and cannot claim this metadata check.
 * This does not authenticate caller evidence, apply factors or verify structural adequacy. */
export function studyWithDocumentedModulus(
  envelope: LoadEnvelope, catalog: LumberCatalog, input: AxialStabilityStudyInput,
  expected: LumberModulusPublication, evidence?: LumberModulusEvidence,
) {
  validateLumberCatalog(catalog);
  const record = catalog.records.find(row => row.referenceValueId === input.referenceValueId);
  const outstanding: string[] = [];
  if (!record || !expected || !text(expected.edition) || !hash(expected.supplementSha256) ||
    !text(expected.addendumId) || !hash(expected.addendumSha256) ||
    expected.supplementSha256 === expected.addendumSha256 || record.referenceEdition !== expected.edition)
    outstanding.push("The selected catalog row needs an exact, consistent edition and separate Supplement/addendum identifiers.");
  if (!record || !evidence || evidence.catalogId !== catalog.catalogId || evidence.referenceValueId !== record.referenceValueId ||
    evidence.publisher !== record.referencePublisher || evidence.table !== record.referenceTable ||
    evidence.speciesGroup !== record.speciesGroup || evidence.grade !== record.grade || evidence.nominalSize !== record.nominalSize ||
    evidence.actualWidthIn !== record.actualWidthIn || evidence.actualDepthIn !== record.actualDepthIn)
    outstanding.push("The documented row does not match the selected catalog's exact species, grade, stock and source table.");
  const exactColumn = (candidate: ColumnEvidence | undefined, column: ColumnEvidence["column"], value: number | undefined) =>
    !!candidate && !!expected && candidate.column === column && candidate.checkedValuePsi === value &&
    text(candidate.checkId) && samePublication(candidate.publication, expected);
  if (!exactColumn(evidence?.mean, "E", record?.ePsi) || !exactColumn(evidence?.minimum, "Emin", record?.eMinPsi))
    outstanding.push("Document distinct E and Emin columns from the same exact Supplement edition/addendum; a reused or mixed source is held.");
  const study = outstanding.length === 0 ? studyPreliminaryAxialStability(envelope, catalog, input) : null;
  return { documentationStatus: study ? "DOCUMENTED_NOT_VERIFIED" as const : "HOLD_MISSING_OR_MIXED_MODULUS_EVIDENCE" as const,
    selectedColumn: input.modulus === "catalog-mean" ? "E" as const : input.modulus === "catalog-minimum" ? "Emin" as const : null,
    publication: study ? {edition: expected.edition, supplementSha256: expected.supplementSha256,
      addendumId: expected.addendumId, addendumSha256: expected.addendumSha256} : null,
    outstanding, study, ndsReady: false as const, approvedForStructuralUse: false as const };
}
