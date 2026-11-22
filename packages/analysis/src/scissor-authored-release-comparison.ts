import {
  buildAuthoredElasticFrameLoadCombinations,
  type AuthoredElasticFrameLoadCombinationsInput,
} from "./elastic-frame-authored-load-combinations.js";
import { assertElasticFrameAuthoredSourceTargets } from "./elastic-frame-authored-source-targets.js";
import { buildElasticFramePhysicalResultant } from "./elastic-frame-physical-resultant.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";
import { solveElasticFrame } from "./elastic-frame-solve.js";
import { buildScissorAuthoredElasticFrameModel } from "./scissor-authored-elastic-frame-model.js";
import { buildAuthoredScissorReleaseVariants } from "./scissor-authored-release-variants.js";

const fields = ["modelId", "modelRevision", "roof", "memberAssignments", "supports", "sources", "combinations",
  "originNodeId", "releaseVariants", "memberIds"] as const;
const exact = (value: unknown): value is Record<typeof fields[number], unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) &&
  Reflect.ownKeys(value).length === fields.length &&
  fields.every(key => Object.prototype.propertyIsEnumerable.call(value, key));
const validId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(value);

function pickExact<T>(rows: Record<string, T>, ids: readonly string[]): Record<string, T> {
  return Object.fromEntries(ids.map(id => {
    if (!Object.hasOwn(rows, id)) throw new Error(`No exact solved result for requested scissor member ${id}`);
    return [id, rows[id]];
  }));
}

/** Compare only explicitly authored changes in idealized end releases. Share
 * one geometry, one member property basis and one set of weighted cases. Each
 * variant/case is solved once; review results are not design or fabrication. */
export function compareAuthoredScissorElasticFrameReleases(input: unknown) {
  const snapshot = snapshotElasticFrameReviewData(input);
  if (!exact(snapshot) || !validId(snapshot.originNodeId)) {
    throw new Error("Exact authored scissor release comparison fields and origin node ID are required");
  }
  const { modelId, modelRevision, roof, memberAssignments, supports, sources, combinations,
    originNodeId, releaseVariants, memberIds } = snapshot;
  if (!Array.isArray(combinations) || combinations.length < 1 || combinations.length > 8) {
    throw new Error("One to eight authored combination cases are required for scissor release comparison");
  }
  if (!Array.isArray(memberIds) || memberIds.length < 1 || memberIds.length > 13 ||
      !memberIds.every(validId) || new Set(memberIds).size !== memberIds.length) {
    throw new Error("One to 13 unique exact scissor member IDs are required");
  }
  const base = buildScissorAuthoredElasticFrameModel({ roof, memberAssignments, supports });
  const known = new Set(base.members.map(row => row.id));
  if (memberIds.some(id => !known.has(id))) throw new Error("A requested member ID does not exist in the authored scissor frame");
  if (!base.nodes.some(node => node.id === originNodeId)) throw new Error("The origin node does not exist in the authored scissor frame");
  const request = { modelId, modelRevision, sources, combinations } as AuthoredElasticFrameLoadCombinationsInput;
  const authored = buildAuthoredElasticFrameLoadCombinations(request);
  assertElasticFrameAuthoredSourceTargets(base, request.sources);
  const hypotheses = buildAuthoredScissorReleaseVariants(base, releaseVariants);
  const memberDeflectionExtrema = memberIds.map(memberId => ({ memberId }));
  const variants = hypotheses.map(({ variantId, sourceRef, overrides, frame }) => ({
    variantId, sourceRef, overrides,
    cases: authored.cases.map(({ caseId, ...actions }) => {
      try {
        const solved = solveElasticFrame({ ...frame, ...actions, memberDeflectionExtrema });
        return {
          caseId,
          memberEndActions: pickExact(solved.memberEndActions, memberIds),
          memberDeflectionExtrema: pickExact(solved.memberDeflectionExtrema, memberIds),
          physicalResultant: buildElasticFramePhysicalResultant(frame, actions, solved.reactions, originNodeId),
        };
      } catch (error) {
        throw new Error(`Authored scissor release variant ${variantId}, case ${caseId} failed: ${error instanceof Error ? error.message : "invalid elastic frame result"}`,
          { cause: error });
      }
    }),
  }));
  return { modelId: authored.modelId, modelRevision: authored.modelRevision, family: "scissor" as const,
    combinationProvenance: authored.provenance, variants,
    status: "PRELIMINARY_NOT_ENGINEERED" as const, fabricationAuthorized: false as const };
}
