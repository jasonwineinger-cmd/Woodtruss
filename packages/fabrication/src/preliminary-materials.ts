import type {TrussModel} from "../../analysis/src/index.js";

/** A schematic inventory of analysis-model bars. Never a lumber or cut order. */
export interface PreliminaryMaterialsReport {
  readonly schemaVersion: "woodtruss.preliminary-materials.v1";
  readonly designId: string;
  readonly revisionId: string;
  readonly units: {readonly length: "in"};
  readonly status: "PRELIMINARY_NOT_ENGINEERED";
  readonly notice: "NOT FOR FABRICATION";
  readonly fabricationAuthorized: false;
  readonly inventoryBasis: "ANALYSIS_MODEL_CENTERLINES_ONLY";
  readonly modelMemberCount: number;
  readonly joints: ReadonlyArray<{readonly jointId: string; readonly xIn: number; readonly yIn: number}>;
  readonly members: ReadonlyArray<{
    readonly memberId: string;
    readonly endJointIds: readonly [string, string];
    /** Euclidean endpoint spacing, preserving model precision. Not a stock or cut length. */
    readonly centerlineLengthIn: number;
  }>;
  readonly excludedFromInventory: readonly string[];
}

function validateId(id: string, label: string): void {
  if (typeof id !== "string" || !id || id.trim() !== id || /[\u0000-\u001f\u007f]/u.test(id))
    throw new Error(`Invalid ${label} identifier`);
}

/** Derives fields from the model; input cannot grant release authority or supply cut dimensions.
 *  The revision is a caller-provided traceability label, not an approval or content hash.
 */
export function createPreliminaryMaterialsReport(
  designId: string, revisionId: string, model: Pick<TrussModel, "nodes" | "bars">,
): PreliminaryMaterialsReport {
  validateId(designId, "design");
  validateId(revisionId, "revision");
  if (!Array.isArray(model?.nodes) || !Array.isArray(model?.bars) || model.nodes.length < 2 || model.bars.length < 1)
    throw new Error("Missing schematic nodes or members");

  const points = new Map<string, {jointId: string; xIn: number; yIn: number}>();
  for (const {id, x, y} of model.nodes) {
    validateId(id, "joint");
    if (points.has(id)) throw new Error(`Duplicate joint identifier: ${id}`);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`Nonfinite joint coordinates: ${id}`);
    points.set(id, Object.freeze({jointId: id, xIn: x === 0 ? 0 : x, yIn: y === 0 ? 0 : y}));
  }

  const members = new Map<string, PreliminaryMaterialsReport["members"][number]>();
  for (const {id, a, b} of model.bars) {
    validateId(id, "member");
    if (members.has(id)) throw new Error(`Duplicate member identifier: ${id}`);
    const start = points.get(a), end = points.get(b);
    if (!start || !end) throw new Error(`Unknown member endpoint: ${id}`);
    const centerlineLengthIn = Math.hypot(end.xIn - start.xIn, end.yIn - start.yIn);
    if (!Number.isFinite(centerlineLengthIn) || centerlineLengthIn < 1e-9)
      throw new Error(`Invalid member centerline length: ${id}`);
    members.set(id, Object.freeze({
      memberId: id, endJointIds: Object.freeze([a, b] as const), centerlineLengthIn,
    }));
  }

  // Locale-independent key ordering preserves deterministic serialized rows on replay.
  const byKey = <T>(records: Map<string, T>) => Object.freeze([...records.keys()].sort().map(key => records.get(key)!));
  return Object.freeze({
    schemaVersion: "woodtruss.preliminary-materials.v1",
    designId, revisionId, units: Object.freeze({length: "in" as const}),
    status: "PRELIMINARY_NOT_ENGINEERED",
    notice: "NOT FOR FABRICATION",
    fabricationAuthorized: false,
    inventoryBasis: "ANALYSIS_MODEL_CENTERLINES_ONLY",
    modelMemberCount: members.size,
    joints: byKey(points), members: byKey(members),
    excludedFromInventory: Object.freeze([
      "Approved lumber sizes, grades, quantities, and purchase lengths",
      "Finished part dimensions, cut angles, splice and bearing details",
      "Connector plate selection, press settings, and machine instructions",
    ]),
  });
}
