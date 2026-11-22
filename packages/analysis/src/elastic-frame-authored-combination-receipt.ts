import {
  studyAuthoredElasticFrameCombinationStress,
  type AuthoredElasticFrameCombinationStressInput,
} from "./elastic-frame-authored-combination-stress.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";

type Immutable<T> = T extends object ? { readonly [K in keyof T]: Immutable<T[K]> } : T;

export type AuthoredElasticFrameCombinationReviewReceipt<
  T = Immutable<AuthoredElasticFrameCombinationStressInput>,
> = Readonly<{
  kind: "authored-elastic-frame-combination-review/v1";
  input: T;
  status: "PRELIMINARY_NOT_ENGINEERED";
  manufacturingApproved: false;
}>;

/** Internal serialization boundary shared by capture and replay. This creates a
 * detached, deeply frozen canonical data snapshot (with negative zero
 * normalized to zero). It does not establish frame semantics, source identity,
 * a signature, replay authority, or engineering acceptance. */
export function snapshotAuthoredElasticFrameCombinationReview(
  input: unknown,
): AuthoredElasticFrameCombinationReviewReceipt<unknown> {
  return Object.freeze({
    kind: "authored-elastic-frame-combination-review/v1",
    input: snapshotElasticFrameReviewData(input),
    status: "PRELIMINARY_NOT_ENGINEERED",
    manufacturingApproved: false,
  });
}

/** Capture only input to the bounded review after freshly solving the exact
 * detached snapshot. No result or authorization is cached in the receipt. */
export function captureAuthoredElasticFrameCombinationReview(input: unknown): AuthoredElasticFrameCombinationReviewReceipt {
  const receipt = snapshotAuthoredElasticFrameCombinationReview(input);
  // The exact existing study is the runtime validator of the authored model,
  // member rectangle, load source and case semantics; the snapshot is plain
  // immutable data before anything is supplied to that study.
  studyAuthoredElasticFrameCombinationStress(receipt.input as AuthoredElasticFrameCombinationStressInput);
  return receipt as AuthoredElasticFrameCombinationReviewReceipt;
}
