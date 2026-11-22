import { snapshotElasticFrameReviewData } from "../../analysis/src/elastic-frame-reviewed-plain-data.js";

const MAX_PIECES = 1_024;
const MAX_ID_LENGTH = 240;
const flags = {
  reportedInventoryIndependentlyVerified: false,
  inventoryAllocated: false,
  physicalTrimVerified: false,
  approvedForStructuralUse: false,
  engineeringApproved: false,
  fabricationAuthorized: false,
  machineReleaseAuthorized: false,
  shippingAuthorized: false,
} as const;
const hold = () => ({
  status: "HOLD_PRELIMINARY_REPORTED_LENGTH_BUDGET" as const,
  outstanding: ["Exact bounded reported length and kerf records are required"],
  ...flags,
});

function exact<K extends string>(value: unknown, keys: readonly K[]): value is Record<K, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function ticks(value: unknown, minimum: 0 | 1): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
}
function id(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH &&
    value.trim() === value && !/\p{Cc}/u.test(value);
}
function sum(left: number, right: number): number {
  if (right > Number.MAX_SAFE_INTEGER - left) throw new Error("Reported length exceeds the exact tick range");
  return left + right;
}

/** Nominal length totals for one caller-reported stock record, in 1/64-in
 * ticks. Separators are counted, not assigned to coordinates or an order.
 * No stock recommendation, trim proof, physical fit, or production authority. */
export function reviewPreliminaryReportedLengthBudget(input: unknown) {
  try {
    const row = snapshotElasticFrameReviewData(input);
    if (!exact(row, ["stockRecordId", "stockLengthTicks", "pieces", "separators", "endTrims"])) return hold();
    const { stockRecordId, stockLengthTicks, pieces, separators, endTrims } = row;
    if (!id(stockRecordId) || !ticks(stockLengthTicks, 1) ||
        !Array.isArray(pieces) || pieces.length < 1 || pieces.length > MAX_PIECES ||
        !Array.isArray(separators) || separators.length !== pieces.length - 1 ||
        !exact(endTrims, ["leading", "trailing"])) return hold();

    const usedIds = new Set([stockRecordId]);
    function useId(value: unknown): boolean {
      if (!id(value) || usedIds.has(value)) return false;
      usedIds.add(value);
      return true;
    }
    let pieceLengthTicks = 0, separatorKerfTicks = 0, endTrimOffcutTicks = 0, endTrimKerfTicks = 0;
    for (const piece of pieces as unknown[]) {
      if (!exact(piece, ["pieceRecordId", "lengthTicks"]) ||
          !useId(piece.pieceRecordId) || !ticks(piece.lengthTicks, 1)) return hold();
      pieceLengthTicks = sum(pieceLengthTicks, piece.lengthTicks);
    }
    for (const separator of separators as unknown[]) {
      if (!exact(separator, ["separatorRecordId", "kerfTicks"]) ||
          !useId(separator.separatorRecordId) || !ticks(separator.kerfTicks, 1)) return hold();
      separatorKerfTicks = sum(separatorKerfTicks, separator.kerfTicks);
    }
    for (const trim of [endTrims.leading, endTrims.trailing]) {
      if (!exact(trim, ["trimRecordId", "offcutTicks", "kerfTicks"]) ||
          !useId(trim.trimRecordId) || !ticks(trim.offcutTicks, 0) || !ticks(trim.kerfTicks, 0)) return hold();
      endTrimOffcutTicks = sum(endTrimOffcutTicks, trim.offcutTicks);
      endTrimKerfTicks = sum(endTrimKerfTicks, trim.kerfTicks);
    }
    const requiredLengthTicks = sum(sum(sum(pieceLengthTicks, separatorKerfTicks), endTrimOffcutTicks), endTrimKerfTicks);
    // Both operands are positive safe integers; their difference is also exact.
    const marginTicks = stockLengthTicks - requiredLengthTicks;
    const balance = marginTicks > 0 ? "nominal-surplus" : marginTicks === 0 ? "nominal-exact" : "nominal-short";
    return {
      status: "PRELIMINARY_REPORTED_LENGTH_BUDGET_ONLY" as const,
      stockRecordId, stockLengthTicks, pieceLengthTicks, separatorKerfTicks,
      endTrimOffcutTicks, endTrimKerfTicks, requiredLengthTicks, marginTicks, balance,
      outstanding: [],
      ...flags,
    };
  } catch {
    return hold();
  }
}
