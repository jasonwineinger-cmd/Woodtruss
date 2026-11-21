import {verifyPreliminaryReviewChecklist, type PreliminaryReviewChecklist} from "./preliminary-review-checklist.js";
import type {PreliminarySchematicComparisonInput} from "./preliminary-schematic-comparison.js";

type Check = PreliminaryReviewChecklist["operatorChecks"][number];
const USE_SCOPE = "OFFLINE_SCHEMATIC_REVIEW_ACKNOWLEDGMENT_ONLY";

export interface PreliminaryReviewReceiptEvidence {
  readonly checklist: unknown;
  readonly from: PreliminarySchematicComparisonInput;
  readonly to: PreliminarySchematicComparisonInput;
}

export interface PreliminaryReviewReceiptPrompt {
  readonly schemaVersion: "woodtruss.preliminary-review-receipt-prompt.v1";
  readonly useScope: typeof USE_SCOPE;
  readonly checklistSha256: string;
  readonly checks: readonly Check[];
}

export interface PreliminaryReviewAcknowledgment {
  readonly useScope: typeof USE_SCOPE;
  readonly checklistSha256: string;
  readonly acknowledgedChecks: readonly Check[];
}

export interface PreliminaryReviewReceipt extends PreliminaryReviewAcknowledgment {
  readonly schemaVersion: "woodtruss.preliminary-review-receipt.v1";
  readonly designId: string;
  readonly fromRevisionId: string;
  readonly toRevisionId: string;
  readonly pendingChecks: readonly Check[];
  readonly disposition: "ACKNOWLEDGMENT_ONLY_NOT_SIGNOFF";
  readonly engineeringSignoffVerified: false;
  readonly fabricationAuthorized: false;
  readonly notice: "NOT FOR FABRICATION";
}

async function digest(checklist: PreliminaryReviewChecklist): Promise<string> {
  const revision = ({revisionId, sourceGeometrySha256, schematicSvgSha256}: PreliminaryReviewChecklist["from"]) =>
    [revisionId, sourceGeometrySha256, schematicSvgSha256];
  const count = ({added, removed, changed}: PreliminaryReviewChecklist["counts"]["joints"]) => [added, removed, changed];
  const bytes = new TextEncoder().encode(JSON.stringify([
    "woodtruss.preliminary-review-receipt.checklist-digest.v1", checklist.schemaVersion, checklist.designId,
    revision(checklist.from), revision(checklist.to), checklist.comparison,
    count(checklist.counts.joints), count(checklist.counts.members),
    checklist.operatorChecks.map(c => [c.code, c.ids]), checklist.excluded, checklist.notice, checklist.fabricationAuthorized,
  ]));
  const sha = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(sha), b => b.toString(16).padStart(2, "0")).join("");
}

function replay(evidence: PreliminaryReviewReceiptEvidence) {
  return verifyPreliminaryReviewChecklist(evidence.checklist, evidence.from, evidence.to);
}

/** Get the exact checklist identity and review IDs to present to the offline operator. */
export async function preparePreliminaryReviewReceipt(evidence: PreliminaryReviewReceiptEvidence): Promise<PreliminaryReviewReceiptPrompt> {
  const checklist = await replay(evidence);
  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-review-receipt-prompt.v1", useScope: USE_SCOPE,
    checklistSha256: await digest(checklist), checks: checklist.operatorChecks,
  });
}

function inert<K extends string>(value: unknown, keys: readonly K[]): Record<K, unknown> {
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype)
    throw new Error("Expected an inert review record");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== keys.length ||
      !keys.every(key => Object.hasOwn(descriptors, key) && Object.hasOwn(descriptors[key], "value")))
    throw new Error("Invalid acknowledgment fields");
  return Object.fromEntries(keys.map(key => [key, descriptors[key].value])) as Record<K, unknown>;
}

function inertList(value: unknown): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    throw new Error("Expected an acknowledgment list");
  const desc = Object.getOwnPropertyDescriptors(value);
  const n = value.length;
  if (Reflect.ownKeys(desc).length !== n + 1) throw new Error("Invalid acknowledgment list");
  return Array.from({length: n}, (_, i) => {
    if (!Object.hasOwn(desc, i) || !Object.hasOwn(desc[i], "value")) throw new Error("Invalid acknowledgment list");
    return desc[i].value;
  });
}

/** Record a self-attested acknowledgment of exact checks or a subset. This does not verify review performance or identity. */
export async function createPreliminaryReviewReceipt(
  evidence: PreliminaryReviewReceiptEvidence, acknowledgment: unknown,
): Promise<PreliminaryReviewReceipt> {
  const claim = inert(acknowledgment, ["useScope", "checklistSha256", "acknowledgedChecks"]);
  if (claim.useScope !== USE_SCOPE) throw new Error("Unsupported acknowledgment scope");
  const ack = new Map<unknown, unknown[]>();
  for (const row of inertList(claim.acknowledgedChecks)) {
    const {code, ids} = inert(row, ["code", "ids"]);
    if (ack.has(code)) throw new Error("Duplicate acknowledgment check");
    ack.set(code, inertList(ids));
  }
  const checklist = await replay(evidence);
  const checklistSha256 = await digest(checklist);
  if (claim.checklistSha256 !== checklistSha256) throw new Error("Acknowledgment checklist digest mismatch");
  const acknowledged: Check[] = [], pending: Check[] = [];
  for (const check of checklist.operatorChecks) {
    const ids = ack.get(check.code);
    if (!ids) { pending.push(check); continue; }
    if (check.ids.length !== ids.length || !check.ids.every((id, i) => ids[i] === id))
      throw new Error("Acknowledged IDs do not match the verified check");
    acknowledged.push(check);
  }
  if (acknowledged.length !== ack.size) throw new Error("Acknowledgment references an unknown check");
  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-review-receipt.v1", useScope: USE_SCOPE, checklistSha256,
    designId: checklist.designId, fromRevisionId: checklist.from.revisionId, toRevisionId: checklist.to.revisionId,
    acknowledgedChecks: Object.freeze(acknowledged), pendingChecks: Object.freeze(pending),
    disposition: "ACKNOWLEDGMENT_ONLY_NOT_SIGNOFF", engineeringSignoffVerified: false,
    fabricationAuthorized: false, notice: "NOT FOR FABRICATION",
  });
}

function matches(expected: unknown, received: unknown): boolean {
  if (expected === received) return true;
  if (Array.isArray(expected)) {
    const rows = inertList(received);
    return expected.length === rows.length && expected.every((v, i) => matches(v, rows[i]));
  }
  if (!expected || typeof expected !== "object") return false;
  const record = expected as Record<string, unknown>;
  const keys = Object.keys(record);
  const actual = inert(received, keys);
  return keys.every(key => matches(record[key], actual[key]));
}

/** Verify a persisted receipt against the original operator claim and independently replayed evidence. */
export async function verifyPreliminaryReviewReceipt(
  saved: unknown, evidence: PreliminaryReviewReceiptEvidence, originalAcknowledgment: unknown,
): Promise<PreliminaryReviewReceipt> {
  const candidate = await createPreliminaryReviewReceipt(evidence, originalAcknowledgment);
  try {
    if (matches(candidate, saved)) return candidate;
  } catch { /* Invalid record shape is equivalent to a mismatched receipt. */ }
  throw new Error("Receipt does not match the acknowledged preliminary review checks");
}
