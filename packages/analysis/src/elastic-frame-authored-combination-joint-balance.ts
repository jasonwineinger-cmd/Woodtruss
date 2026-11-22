import { runAuthoredFrameJointBalance } from "./authored-frame-joint-balance.js";
import type { AuthoredElasticFrameLoadCombinationsInput } from "./elastic-frame-authored-load-combinations.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";
import type { ElasticFrameInput } from "./elastic-frame-solve.js";

const fields = ["modelId", "modelRevision", "frame", "sources", "combinations", "caseJoints"] as const;
const frameFields = ["nodes", "members", "supports"] as const;
type Frame = Pick<ElasticFrameInput, typeof frameFields[number]>;
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  record(value) && Reflect.ownKeys(value).length === keys.length &&
  keys.every(key => Object.prototype.propertyIsEnumerable.call(value, key));
const fail = (description: string) => new Error(`Authored frame joint balance: ${description}`);

/** Isolated preliminary frame ledger with explicitly authored global Cartesian
 * or inclined restraints. The horizontal coordinate extent is an intake limit,
 * not a physical bearing span or a topology/family qualification. */
export function studyAuthoredElasticFrameCombinationJointBalance(input: unknown) {
  const data = snapshotElasticFrameReviewData(input);
  if (!exact(data, fields) || !exact(data.frame, frameFields))
    throw fail("exact authored frame, combinations and ordered case joints are required");
  const { nodes, members, supports } = data.frame;
  if (!Array.isArray(nodes) || nodes.length < 2 || nodes.length > 50 ||
      !Array.isArray(members) || !members.length || members.length > 100 || !members.every(record) ||
      !Array.isArray(supports) || !supports.length || supports.length > nodes.length || !supports.every(record))
    throw fail("exact bounded modeled nodes, members and restraints are required");
  let minX = Infinity, maxX = -Infinity;
  for (const node of nodes as unknown[]) {
    if (!exact(node, ["id", "xIn", "yIn"]) || typeof node.xIn !== "number" || !Number.isFinite(node.xIn))
      throw fail("finite explicit modeled node X coordinates are required");
    minX = Math.min(minX, node.xIn);
    maxX = Math.max(maxX, node.xIn);
  }
  const width = maxX - minX;
  if (!Number.isFinite(width) || width > 600)
    throw fail("modeled horizontal coordinate extent cannot exceed 600 inches");
  const { frame, modelId, modelRevision, sources, combinations, caseJoints } =
    data as AuthoredElasticFrameLoadCombinationsInput & { frame: Frame; caseJoints: unknown };
  return runAuthoredFrameJointBalance(frame, {modelId, modelRevision, sources, combinations, caseJoints},
    {label:"Authored frame",additionalWarnings:[
      "The generic model uses only the explicitly authored frame and restraints; it does not establish any truss family or physical support detail.",
    ] as const});
}
