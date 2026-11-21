import type { RoofInput } from "../../geometry/src/index.js";
import { generateCommonTopology } from "../../geometry/src/topology.js";
import { analyzePreliminaryAsymmetricCommonTruss, type PreliminaryAsymmetricCommonInput } from "./asymmetric-common-analysis.js";
import { makeExplicitLoadCase, type ExplicitLoadCase } from "./cases.js";
import { auditGlobalEquilibrium } from "./equilibrium.js";
import { analyzePinJointedTruss, type TrussModel } from "./index.js";
import { auditAnalysisInputs } from "./input-audit.js";
import { auditJointEquilibrium } from "./joint-equilibrium.js";
import { analyzePreliminaryMonoTruss, type PreliminaryMonoAnalysisInput } from "./mono-analysis.js";
import { analyzePreliminaryRaisedHeelCommonTruss, type PreliminaryRaisedHeelCommonInput } from "./raised-heel-common-analysis.js";

import { analyzePreliminaryScissorExplicit, type PreliminaryScissorExplicitInput } from "./scissor-explicit-analysis.js";

interface CommonInput {
  roof: RoofInput;
  areaIn2: number;
  elasticModulusPsi: number;
  loadCase: ExplicitLoadCase;
}

export type ExplicitFamilyRequest =
  | ({ variant:"common-level" } & CommonInput)
  | ({ variant:"common-asymmetric" } & PreliminaryAsymmetricCommonInput)
  | ({ variant:"common-raised-heel" } & PreliminaryRaisedHeelCommonInput)
  | ({ variant:"mono-level" } & PreliminaryMonoAnalysisInput)
  | ({ variant:"scissor-level" } & PreliminaryScissorExplicitInput);

/** This list covers this dispatcher only; it is not a repo-wide capability claim. */
export const EXPLICIT_POINT_LOAD_VARIANTS = Object.freeze([
  "common-level","common-asymmetric","common-raised-heel","mono-level","scissor-level",
] as const);

/** Dispatch signed authored point loads only, without topology fallback or manufacturing approval. */
export function analyzeExplicitFamily(request: ExplicitFamilyRequest) {
  const { variant } = request;
  const options = ["spanFt","heelHeightIn","overhangIn"];
  function requireRoofKeys(allowed: readonly string[]) {
    if (Object.keys(request.roof).some(key => !allowed.includes(key)))
      throw new Error("Unsupported roof option for the explicit point-load variant");
  }
  switch (request.variant) {
    case "common-asymmetric":
      requireRoofKeys([...options,"leftPitchRisePer12","rightPitchRisePer12"]);
      return { variant:request.variant,...analyzePreliminaryAsymmetricCommonTruss(request) };
    case "common-raised-heel":
      requireRoofKeys([...options,"family","pitchRisePer12","bottomPitchRisePer12"]);
      return { variant:request.variant,...analyzePreliminaryRaisedHeelCommonTruss(request) };
    case "mono-level":
      requireRoofKeys([...options,"family","pitchRisePer12","bottomPitchRisePer12"]);
      return { variant:request.variant,...analyzePreliminaryMonoTruss(request) };
    case "scissor-level":
      requireRoofKeys([...options,"family","pitchRisePer12","bottomPitchRisePer12"]);
      return { variant:request.variant,...analyzePreliminaryScissorExplicit(request) };
    case "common-level":
      requireRoofKeys([...options,"family","pitchRisePer12","bottomPitchRisePer12"]);
      return { variant:request.variant,...analyzeCommonLevel(request) };
    default: throw new Error(`Unsupported explicit point-load variant: ${String(variant)}`);
  }
}

function analyzeCommonLevel(input: CommonInput) {
  if (input.roof.bottomPitchRisePer12 !== undefined)
    throw new Error("Common level topology requires a flat bottom chord");
  if (!Number.isFinite(input.areaIn2) || input.areaIn2 <= 0 ||
      !Number.isFinite(input.elasticModulusPsi) || input.elasticModulusPsi <= 0)
    throw new Error("Common level analysis requires positive finite illustrative area and modulus");
  const topology = generateCommonTopology(input.roof);
  const basis: TrussModel = {
    nodes: topology.joints.map(({id,position})=>({id,...position})),
    bars: topology.members.map(({id,start,end})=>({
      id,a:start,b:end,areaIn2:input.areaIn2,elasticModulusPsi:input.elasticModulusPsi,
    })),
    supports:[{nodeId:"L",fixX:true,fixY:true},{nodeId:"E",fixX:false,fixY:true}],
    loads:[],
  };
  const model = makeExplicitLoadCase(basis,input.loadCase);
  const audit = auditAnalysisInputs(model);
  if (!audit.valid) throw new Error(`Invalid common analysis inputs: ${audit.issues.join("; ")}`);
  const result = analyzePinJointedTruss(model);
  const global = auditGlobalEquilibrium(model,result);
  const joints = auditJointEquilibrium(model,result.axialForceLb,result.reactionLb);
  if (!global.passes || !joints.passes) throw new Error("Common level result failed equilibrium audits");
  return {
    model,result,equilibrium:{global,joints},
    status:"PRELIMINARY_NOT_ENGINEERED" as const,
    fabricationAuthorized:false as const,
    warnings:[...topology.warnings,"Signed authored joint forces and illustrative properties only; no site design loads."],
  };
}
