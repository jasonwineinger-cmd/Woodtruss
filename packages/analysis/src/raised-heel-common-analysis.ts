import { generateRaisedHeelCommonTopology } from "../../geometry/src/raised-heel-common-topology.js";
import type { RoofInput } from "../../geometry/src/index.js";
import { makeExplicitLoadCase, type ExplicitLoadCase } from "./cases.js";
import { auditGlobalEquilibrium } from "./equilibrium.js";
import { analyzePinJointedTruss, type TrussModel } from "./index.js";
import { auditAnalysisInputs } from "./input-audit.js";
import { auditJointEquilibrium } from "./joint-equilibrium.js";

export interface PreliminaryRaisedHeelCommonInput {
  roof: RoofInput;
  /** Uniform illustrative properties; not a selected or graded stock. */
  areaIn2: number;
  elasticModulusPsi: number;
  loadCase: ExplicitLoadCase;
}

/**
 * Analyze the symmetric raised-heel centerlines on their separate level bearings.
 * Uses a left pin and right vertical roller, not support, bearing or uplift design.
 * Does not derive environmental loads, stock, connectors or fabrication data.
 */
export function analyzePreliminaryRaisedHeelCommonTruss(input: PreliminaryRaisedHeelCommonInput) {
  if (!Number.isFinite(input.areaIn2) || input.areaIn2 <= 0 ||
      !Number.isFinite(input.elasticModulusPsi) || input.elasticModulusPsi <= 0)
    throw new Error("Raised-heel common analysis requires positive finite illustrative area and modulus");
  const topology = generateRaisedHeelCommonTopology(input.roof);
  const modelBase: TrussModel = {
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
  const model = makeExplicitLoadCase(modelBase, input.loadCase);
  const inputAudit = auditAnalysisInputs(model);
  if (!inputAudit.valid) throw new Error(`Invalid raised-heel common analysis inputs: ${inputAudit.issues.join("; ")}`);
  const result = analyzePinJointedTruss(model);
  const global = auditGlobalEquilibrium(model, result);
  const joints = auditJointEquilibrium(model, result.axialForceLb, result.reactionLb);
  if (!global.passes || !joints.passes) throw new Error("Raised-heel common solver result did not pass equilibrium audits");

  return {
    referenceTopHeels: { ...topology.topHeels },
    model,
    result,
    equilibrium: { global, joints },
    status: "PRELIMINARY_NOT_ENGINEERED" as const,
    fabricationAuthorized: false as const,
    warnings: [
      "Raised-heel joint centerlines are not a heel joint, support, or connection detail.",
      "Illustrative explicit joint loads and uniform properties only; no site or code load combinations.",
      "Pin/roller idealization; restraint, uplift, buckling, member capacity and bearing are unverified.",
    ],
  };
}
