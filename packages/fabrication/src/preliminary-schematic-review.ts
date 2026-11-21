import {parsePreliminaryMaterialsSnapshot} from "./preliminary-materials-revisions.js";
import {createPreliminaryReviewHandoff, type PreliminaryReviewHandoffEvidence} from "./preliminary-review-handoff.js";
import type {PreliminaryMaterialsReport} from "./preliminary-materials.js";

export interface PreliminarySchematicReview {
  readonly schemaVersion: "woodtruss.preliminary-schematic-review.v1";
  readonly designId: string;
  readonly revisionId: string;
  readonly sourceGeometrySha256: string;
  readonly traceabilityManifestSha256: string;
  readonly schematicSvgSha256: string;
  readonly format: "NORMALIZED_VECTOR_REVIEW_NO_DIMENSIONS";
  readonly drawingSvg: string;
  readonly notice: "PRELIMINARY - NOT FOR FABRICATION";
  readonly fabricationAuthorized: false;
}

function render(report: PreliminaryMaterialsReport): string {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const {xIn, yIn} of report.joints) {
    minX = Math.min(minX, xIn); maxX = Math.max(maxX, xIn);
    minY = Math.min(minY, yIn); maxY = Math.max(maxY, yIn);
  }
  const dx = maxX - minX, dy = maxY - minY;
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.max(dx, dy) === 0)
    throw new Error("Unrenderable schematic bounds");
  // Fixed viewport units only. No real-world dimension, part labels, or machine data appear in the drawing.
  const unitsPerScreenPoint = Math.max(dx / 576, dy / 272);
  const points = new Map(report.joints.map(({jointId, xIn, yIn}) => [jointId, [
    (320 + ((xIn - minX) - dx/2) / unitsPerScreenPoint).toFixed(3),
    (160 + ((maxY - yIn) - dy/2) / unitsPerScreenPoint).toFixed(3),
  ] as const]));
  const lines = report.members.map(({endJointIds: [a, b]}) => {
    const [x1, y1] = points.get(a)!;
    const [x2, y2] = points.get(b)!;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }).join("");
  const joints = [...points.values()].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5"/>`).join("");
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-labelledby="title">' +
    '<title id="title">PRELIMINARY - NOT FOR FABRICATION</title><rect width="640" height="360" fill="white"/>' +
    `<g stroke="#244260" stroke-width="1.5">${lines}</g><g fill="#244260">${joints}</g>` +
    '<text x="24" y="340" fill="#9b2121" font-size="16">PRELIMINARY - NOT FOR FABRICATION</text></svg>';
}

async function sha(text: string): Promise<string> {
  const bytes = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), v => v.toString(16).padStart(2, "0")).join("");
}

/** Render a small on-screen schematic from verified, independently expected revision evidence. */
export async function createPreliminarySchematicReview(evidence: PreliminaryReviewHandoffEvidence): Promise<PreliminarySchematicReview> {
  const snapshot = parsePreliminaryMaterialsSnapshot(evidence.snapshot);
  const handoff = await createPreliminaryReviewHandoff({snapshot, traceabilityManifest: evidence.traceabilityManifest, expected: evidence.expected});
  const drawingSvg = render(snapshot);
  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-schematic-review.v1",
    designId: handoff.designId, revisionId: handoff.revisionId,
    sourceGeometrySha256: handoff.sourceGeometrySha256,
    traceabilityManifestSha256: handoff.traceabilityManifestSha256,
    schematicSvgSha256: await sha(drawingSvg),
    format: "NORMALIZED_VECTOR_REVIEW_NO_DIMENSIONS",
    drawingSvg,
    notice: "PRELIMINARY - NOT FOR FABRICATION",
    fabricationAuthorized: false,
  });
}

/** Return only exact locally regenerated SVG. Never preview a supplied SVG before this succeeds. */
export async function verifyPreliminarySchematicReview(saved: unknown, evidence: PreliminaryReviewHandoffEvidence): Promise<PreliminarySchematicReview> {
  if (!saved || typeof saved !== "object" || Object.getPrototypeOf(saved) !== Object.prototype)
    throw new Error("Expected a schematic review JSON record");
  const received = Object.getOwnPropertyDescriptors(saved);
  const local = await createPreliminarySchematicReview(evidence);
  const keys = Object.keys(local) as Array<keyof PreliminarySchematicReview>;
  if (Reflect.ownKeys(received).length !== keys.length || !keys.every(key =>
    Object.hasOwn(received, key) && Object.hasOwn(received[key], "value") && received[key].value === local[key]))
    throw new Error("Schematic review does not match bound revision evidence");
  return local;
}
