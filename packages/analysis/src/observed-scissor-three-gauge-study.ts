import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";
import { fitObservedScissorStiffness } from "./observed-scissor-stiffness-fit.js";

export type ObservedScissorThreeGaugeRow = {
  stepId: string;
  downwardGaugeIn: readonly [number, number, number];
  verticalBearingReactionLb: readonly [number, number];
};
export type ObservedScissorThreeGaugeStudyInput = {
  specimenId: string;
  testId: string;
  sourceRef: string;
  /** Left-quarter, ridge, right-quarter gauge roles in authored order. */
  gaugeIds: readonly [string, string, string];
  bearingIds: readonly [string, string];
  samples: readonly ObservedScissorThreeGaugeRow[];
  fitWindow: { firstStepId: string; lastStepId: string };
};
const fields = ["specimenId", "testId", "sourceRef", "gaugeIds", "bearingIds", "samples", "fitWindow"] as const;
const id = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(value);
const exact = <Key extends string>(value: unknown, keys: readonly Key[]): value is Record<Key, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) &&
  Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.prototype.propertyIsEnumerable.call(value, key));
const uniqueIds = (values: unknown, count: number): values is string[] =>
  Array.isArray(values) && values.length === count && values.every(id) && new Set(values).size === count;
const readings = (values: unknown, count: number): values is number[] =>
  Array.isArray(values) && values.length === count && values.every(Number.isFinite);
const clean = (value: number) => value === 0 ? 0 : value;

function compensatedSum(values: readonly number[]) {
  let sum = 0, correction = 0;
  for (const value of values) {
    const next = sum + value;
    if (!Number.isFinite(next)) return undefined;
    correction += Math.abs(sum) >= Math.abs(value) ? (sum - next) + value : (value - next) + sum;
    sum = next;
  }
  const exactish = sum + correction;
  return Number.isFinite(exactish) ? exactish : undefined;
}

/** Summarize a caller-authored, explicitly selected segment of one observed
 * scissor specimen. Treat gauge roles as labels, not coordinates. An equal
 * signed mean and a signed bearing sum are descriptive test observations,
 * not modeled supports, fitted material properties or a design check. */
export function studyObservedScissorThreeGaugeStiffness(input: unknown) {
  const snapshot = snapshotElasticFrameReviewData(input);
  if (!exact(snapshot, fields) || !id(snapshot.specimenId) || !id(snapshot.testId) ||
      typeof snapshot.sourceRef !== "string" || !snapshot.sourceRef.trim() || snapshot.sourceRef.length > 1_000 ||
      !uniqueIds(snapshot.gaugeIds, 3) || !uniqueIds(snapshot.bearingIds, 2)) {
    throw new Error("Exact observed scissor specimen, test and source identities plus three unique gauge IDs and two unique bearing IDs are required");
  }
  const { specimenId, testId, sourceRef, gaugeIds, bearingIds, samples, fitWindow } = snapshot;
  if (!Array.isArray(samples) || samples.length < 3 || samples.length > 128 ||
      !exact(fitWindow, ["firstStepId", "lastStepId"]) || !id(fitWindow.firstStepId) || !id(fitWindow.lastStepId)) {
    throw new Error("Three to 128 observed sample rows and an explicit first/last fit window are required");
  }
  const indices = new Map<string, number>();
  const all = samples.map((sample, index) => {
    if (!exact(sample, ["stepId", "downwardGaugeIn", "verticalBearingReactionLb"]) || !id(sample.stepId) ||
        indices.has(sample.stepId) || !readings(sample.downwardGaugeIn, 3) || !readings(sample.verticalBearingReactionLb, 2)) {
      throw new Error("Each observed step requires a unique ID, three finite gauge readings and two finite bearing reactions");
    }
    indices.set(sample.stepId, index);
    const summedGauges = compensatedSum(sample.downwardGaugeIn);
    const mean = summedGauges === undefined
      ? compensatedSum(sample.downwardGaugeIn.map(value => value / 3))
      : summedGauges / 3;
    const reaction = sample.verticalBearingReactionLb[0] + sample.verticalBearingReactionLb[1];
    if (mean === undefined || !Number.isFinite(mean) || !Number.isFinite(reaction) ||
        (mean === 0 && summedGauges !== undefined && summedGauges !== 0)) {
      throw new Error("Observed gauge mean or bearing sum is outside the usable numeric range");
    }
    return { stepId: sample.stepId, averageDownwardIn: clean(mean), totalBearingReactionLb: clean(reaction) };
  });
  const first = indices.get(fitWindow.firstStepId), last = indices.get(fitWindow.lastStepId);
  if (first === undefined || last === undefined || last - first < 2) {
    throw new Error("The explicit first and last fit-window steps must select at least three contiguous observations in authored order");
  }
  const observations = all.slice(first, last + 1);
  const fit = fitObservedScissorStiffness(observations.map(({ averageDownwardIn, totalBearingReactionLb }) =>
    ({ averageDownwardIn, totalBearingReactionLb })));
  return { specimenId, testId, sourceRef, gaugeIds, bearingIds,
    fitWindow: { firstStepId: fitWindow.firstStepId, lastStepId: fitWindow.lastStepId }, observations, fit,
    status: "PRELIMINARY_OBSERVED_COMPARISON_ONLY" as const, fabricationAuthorized: false as const };
}
