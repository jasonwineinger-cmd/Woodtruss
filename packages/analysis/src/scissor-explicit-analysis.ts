import { generateScissorTopology } from "../../geometry/src/scissor.js";
import type { RoofInput } from "../../geometry/src/index.js";
import { makeExplicitLoadCase, type ExplicitLoadCase } from "./cases.js";
import { auditGlobalEquilibrium } from "./equilibrium.js";
import { analyzePinJointedTruss, type TrussModel } from "./index.js";
import { assertAuditedTrussModel } from "./model-audit.js";
import { auditJointEquilibrium } from "./joint-equilibrium.js";

export interface PreliminaryScissorExplicitInput {
  roof: RoofInput;
  /** Uniform illustrative properties; not a selected or graded stock. */
  areaIn2: number;
  elasticModulusPsi: number;
  loadCase: ExplicitLoadCase;
}

/**
 * Analyze level-bearing scissor centerlines under an explicit signed point-load case.
 * Uses a left pin and right vertical roller, not support, bearing or uplift design.
 * Does not derive environmental loads, stock, connectors or fabrication data.
 */
export function analyzePreliminaryScissorExplicit(input: PreliminaryScissorExplicitInput) {
  if (!Number.isFinite(input.areaIn2) || input.areaIn2 <= 0 ||
      !Number.isFinite(input.elasticModulusPsi) || input.elasticModulusPsi <= 0)
    throw new Error("Scissor explicit analysis requires positive finite illustrative area and modulus");
  const topology = generateScissorTopology(input.roof);
  const modelBase: TrussModel = {
    nodes: topology.joints.map(({ id, position }) => ({ id, ...position })),
    bars: topology.members.map(({ id, start, end }) => ({
      id, a: start, b: end, areaIn2: input.areaIn2, elasticModulusPsi: input.elasticModulusPsi,
    })),
    supports: [
      { nodeId: "L", fixX: true, fixY: true },
      { nodeId: "E", fixX: false, fixY: true },
    ],
    loads: [],
  };
  const model = makeExplicitLoadCase(modelBase, input.loadCase);
  assertAuditedTrussModel(model);
  const result = analyzePinJointedTruss(model);
  const global = auditGlobalEquilibrium(model, result);
  const joints = auditJointEquilibrium(model, result.axialForceLb, result.reactionLb);
  if (!global.passes || !joints.passes) throw new Error("Scissor explicit solver result did not pass equilibrium audits");

  return {
    model,
    result,
    equilibrium: { global, joints },
    status: "PRELIMINARY_NOT_ENGINEERED" as const,
    fabricationAuthorized: false as const,
    warnings: [
      "Scissor centerlines on idealized level bearings only; no ceiling member or connection design.",
      "Illustrative explicit joint loads and uniform properties only; no site or code load combinations.",
      "Pin/roller idealization; restraint, uplift, buckling, member capacity and bearing are unverified.",
    ],
  };
}
