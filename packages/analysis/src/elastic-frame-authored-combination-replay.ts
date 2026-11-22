import { snapshotAuthoredElasticFrameCombinationReview } from "./elastic-frame-authored-combination-receipt.js";
import {
  studyAuthoredElasticFrameCombinationStress,
  type AuthoredElasticFrameCombinationStressInput,
} from "./elastic-frame-authored-combination-stress.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";

/** Compare a stored review receipt against independently obtained authored
 * inputs, then solve only the detached expected inputs. Matching JSON is not
 * authentication, code acceptance, or manufacturing approval. */
export function replayAuthoredElasticFrameCombinationReview(
  receipt: unknown,
  expected: AuthoredElasticFrameCombinationStressInput,
) {
  const expectedSnapshot = snapshotAuthoredElasticFrameCombinationReview(expected);
  let submitted: unknown;
  try {
    submitted = snapshotElasticFrameReviewData(receipt);
  } catch (cause) {
    throw new Error("Invalid authored frame combination review receipt", { cause });
  }
  const expectedBytes = JSON.stringify(snapshotElasticFrameReviewData(expectedSnapshot));
  if (JSON.stringify(submitted) !== expectedBytes) {
    throw new Error("Authored frame combination review receipt does not match the exact expected inputs and scope");
  }
  // The snapshot validates plain data, not mechanics. The study validates the
  // entire input again and freshly solves each authored case; nothing from
  // the submitted receipt is used as input or preserved as a result.
  const study = studyAuthoredElasticFrameCombinationStress(
    expectedSnapshot.input as AuthoredElasticFrameCombinationStressInput,
  );
  return { ...study, manufacturingApproved: false as const };
}
