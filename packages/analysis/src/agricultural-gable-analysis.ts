import type { RoofInput } from "../../geometry/src/index.js";
import { generateAgriculturalGableTopology } from "../../geometry/src/agricultural-topology.js";
import { makeExplicitLoadCase, type ExplicitLoadCase } from "./cases.js";
import { auditGlobalEquilibrium } from "./equilibrium.js";
import { analyzePinJointedTruss, type TrussModel } from "./index.js";
import { auditAnalysisInputs } from "./input-audit.js";
import { auditJointEquilibrium } from "./joint-equilibrium.js";

export interface PreliminaryAgriculturalGableInput {
  roof: RoofInput;
  /** Uniform illustrative values, not a selected grade or strength specification. */
  areaIn2: number;
  elasticModulusPsi: number;
  /** Signed user-supplied point loads at existing joints, not actual purlin design. */
  loadCase: ExplicitLoadCase;
}

/** Illustrative tied-gable pin/roller response. No bending, connector or site validation. */
export function analyzePreliminaryAgriculturalGable(input: PreliminaryAgriculturalGableInput) {
  if (!Number.isFinite(input.areaIn2) || input.areaIn2 <= 0 ||
      !Number.isFinite(input.elasticModulusPsi) || input.elasticModulusPsi <= 0)
    throw new Error("Agricultural gable requires positive finite illustrative area and modulus");
  const topology = generateAgriculturalGableTopology(input.roof);
  const basis: TrussModel = {
    nodes: topology.joints.map(({ id, position }) => ({ id, ...position })),
    bars: topology.members.map(({ id, start, end }) => ({
      id, a: start, b: end, areaIn2: input.areaIn2, elasticModulusPsi: input.elasticModulusPsi,
    })),
    supports: [
      { nodeId: topology.bearings.left, fixX: true, fixY: true },
      { nodeId: topology.bearings.right, fixX: false, fixY: true },
    ],
    loads: [],
  };
  const model = makeExplicitLoadCase(basis, input.loadCase);
  const inputs = auditAnalysisInputs(model);
  if (!inputs.valid) throw new Error(`Invalid agricultural gable analysis inputs: ${inputs.issues.join("; ")}`);
  const result = analyzePinJointedTruss(model);
  const global = auditGlobalEquilibrium(model, result);
  const joints = auditJointEquilibrium(model, result.axialForceLb, result.reactionLb);
  if (!global.passes || !joints.passes) throw new Error("Agricultural gable result failed equilibrium audits");
  return {
    topology, model, result, equilibrium: { global, joints },
    status: "PRELIMINARY_NOT_ENGINEERED" as const,
    fabricationAuthorized: false as const,
    warnings: [...topology.warnings, "Signed nodal forces only. No purlin redistribution, load combinations, or uplift anchorage by this model."],
  };
}
