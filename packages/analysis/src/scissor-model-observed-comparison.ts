import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";
import { bindScissorMeasurementCorrespondence } from "./scissor-measurement-correspondence.js";
import { studyObservedScissorThreeGaugeStiffness, type ObservedScissorThreeGaugeStudyInput }
  from "./observed-scissor-three-gauge-study.js";
import { compareScissorPairedReadings } from "./scissor-paired-observable-residual.js";
import { studyScissorModeledThreeGaugeRestraint } from "./scissor-modeled-three-gauge-restraint-study.js";

const fields = ["modeledInput", "observedInput", "scope"] as const;
const exact = (value: unknown): value is Record<typeof fields[number], unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) && Reflect.ownKeys(value).length === fields.length &&
  fields.every(key => Object.prototype.propertyIsEnumerable.call(value, key));

function boundReading(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) throw new Error("Missing exact paired reading");
  return value;
}

/** Review signed modeled-minus-observed residuals under explicit correspondence.
 * Neither caller attestations nor diagnostic tolerances authenticate or validate a model. */
export function compareScissorModeledAndObservedResponse(input: unknown) {
  const snapshot = snapshotElasticFrameReviewData(input);
  if (!exact(snapshot)) throw new Error("Exact modeled input, observed input and comparison scope are required");
  const modeled = studyScissorModeledThreeGaugeRestraint(snapshot.modeledInput);
  const observed = studyObservedScissorThreeGaugeStiffness(snapshot.observedInput);
  const scope = bindScissorMeasurementCorrespondence(snapshot.scope, modeled, observed);
  // The observed study validated every raw reading on the same frozen snapshot.
  // Its selected observations are enforced by the correspondence binder.
  const rawObserved = snapshot.observedInput as ObservedScissorThreeGaugeStudyInput;
  const samples = new Map(rawObserved.samples.map(row => [row.stepId, row]));
  const cases = new Map(modeled.rows.map(row => [row.caseId, row]));
  const rows = scope.stepPairs.map(({ caseId, stepId }) => {
    const model = cases.get(caseId);
    const sample = samples.get(stepId);
    if (!model || !sample) throw new Error("Missing bound scissor case or observed step");
    try {
      const paired = {
        modeledDownwardIn: scope.gaugePairs.map(pair =>
          boundReading(model.restrained.gauges.find(row => row.gaugeId === pair.modeledGaugeId && row.nodeId === pair.nodeId)?.downwardIn)),
        observedDownwardIn: scope.gaugePairs.map(pair =>
          boundReading(sample.downwardGaugeIn[rawObserved.gaugeIds.indexOf(pair.observedGaugeId)])),
        modeledBearingLb: scope.bearingPairs.map(pair =>
          boundReading(model.bearingVerticalReactionsLb.find(row => row.nodeId === pair.modeledNodeId)?.fyLb)),
        observedBearingLb: scope.bearingPairs.map(pair =>
          boundReading(sample.verticalBearingReactionLb[rawObserved.bearingIds.indexOf(pair.observedBearingId)])),
      };
      const residual = compareScissorPairedReadings({ ...paired, maxReactionDifferenceLb: scope.maxReactionDifferenceLb });
      return { caseId, stepId, ...paired, ...residual };
    } catch (error) {
      throw new Error(`Scissor case ${caseId} / observed step ${stepId}: ${error instanceof Error ? error.message : "invalid paired readings"}`,
        { cause: error });
    }
  });
  return { scope, rows, status: "PRELIMINARY_CORRESPONDENCE_ONLY" as const, fabricationAuthorized: false as const };
}
