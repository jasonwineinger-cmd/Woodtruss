import { generateAgriculturalOutline } from "./agricultural.js";
import type { RoofInput } from "./index.js";
import { generateCommonTopology } from "./topology.js";

/**
 * Only the level-bearing, zero-offset tied-gable subset. Reuses the common
 * Fink-like centerline connectivity deliberately; does not design any
 * agricultural assembly or select a topology for arbitrary purlin stations.
 */
export function generateAgriculturalGableTopology(input: RoofInput) {
  const outline = generateAgriculturalOutline(input);
  if ((input.heelHeightIn ?? 0) !== 0) throw new Error("Raised agricultural heel topology is not supported");
  if ((input.overhangIn ?? 0) !== 0) throw new Error("Agricultural overhang topology is not supported");
  if (input.bottomPitchRisePer12 !== undefined) throw new Error("Agricultural gable requires a flat bottom chord");
  const common = generateCommonTopology({ ...input, family: "common" });
  const right = common.joints.find(joint => joint.id === "E")!.position;
  if (right.x !== outline.spanIn || right.y !== 0 || !(outline.roofProfile[1].y > 0))
    throw new Error("Agricultural gable outline and centerline graph do not agree");
  return {
    ...common,
    family: "agricultural" as const,
    subtype: "tied-gable-fink" as const,
    bearings: { left: "L", right: "E" },
    warnings: [...outline.warnings, ...common.warnings],
  };
}
