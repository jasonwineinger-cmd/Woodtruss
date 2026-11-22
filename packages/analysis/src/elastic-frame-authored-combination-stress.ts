import { assertElasticFrameAuthoredSourceTargets } from "./elastic-frame-authored-source-targets.js";
import { buildAuthoredElasticFrameLoadCombinations } from "./elastic-frame-authored-load-combinations.js";
import { studyAuthoredElasticFrameStressCases, type AuthoredElasticFrameStressCasesInput } from "./elastic-frame-authored-stress-cases.js";

export type AuthoredElasticFrameCombinationStressInput =
  Parameters<typeof buildAuthoredElasticFrameLoadCombinations>[0] &
  Pick<AuthoredElasticFrameStressCasesInput,"frame"|"members">;

const exact = (v:unknown,keys:readonly string[]) =>
  v !== null && typeof v === "object" &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null) &&
  Reflect.ownKeys(v).length === keys.length && keys.every(key => Object.prototype.propertyIsEnumerable.call(v,key));

/** Explicit supplied factors on one authored frame. This is not a code
 * combination library, a source authenticity check, or a capacity decision. */
export function studyAuthoredElasticFrameCombinationStress(input: AuthoredElasticFrameCombinationStressInput) {
  if (!exact(input,["modelId","modelRevision","frame","sources","combinations","members"]) ||
      !exact(input.frame,["nodes","members","supports"])) {
    throw new Error("Exact authored frame, model, sources, combinations and member selection are required");
  }
  const {modelId,modelRevision,frame,sources,combinations,members}=input;
  const authored=buildAuthoredElasticFrameLoadCombinations({modelId,modelRevision,sources,combinations});
  const study=studyAuthoredElasticFrameStressCases({modelId,modelRevision,frame,cases:authored.cases,members});

  assertElasticFrameAuthoredSourceTargets(frame,sources);
  return {...study,combinationProvenance:authored.provenance};
}
