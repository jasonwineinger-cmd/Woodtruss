import type { ElasticFrameInput } from "./elastic-frame-solve.js";

const frameFields = ["nodes", "members", "supports"] as const;
export type ExplicitAuthoredFrame = Pick<ElasticFrameInput, typeof frameFields[number]>;
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export const exactAuthoredFrameFields = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  record(value) && Reflect.ownKeys(value).length === keys.length &&
  keys.every(key => Object.prototype.propertyIsEnumerable.call(value, key));
/** Validate the shared generic review scope. The solver owns the detailed
 * member/support checks; the 600-in X extent is not physical bearing span. */
export function parseExplicitAuthoredFrame(frame: unknown, fail: (description: string) => Error,
  shapeError: string): ExplicitAuthoredFrame {
  if (!exactAuthoredFrameFields(frame, frameFields))
    throw fail(shapeError);
  const { nodes, members, supports } = frame;
  if (!Array.isArray(nodes) || nodes.length < 2 || nodes.length > 50 ||
      !Array.isArray(members) || !members.length || members.length > 100 || !members.every(record) ||
      !Array.isArray(supports) || !supports.length || supports.length > nodes.length || !supports.every(record))
    throw fail("exact bounded modeled nodes, members and restraints are required");
  let minX = Infinity, maxX = -Infinity;
  for (const node of nodes as unknown[]) {
    if (!exactAuthoredFrameFields(node, ["id", "xIn", "yIn"]) || typeof node.xIn !== "number" || !Number.isFinite(node.xIn))
      throw fail("finite explicit modeled node X coordinates are required");
    minX = Math.min(minX, node.xIn);
    maxX = Math.max(maxX, node.xIn);
  }
  const width = maxX - minX;
  if (!Number.isFinite(width) || width > 600)
    throw fail("modeled horizontal coordinate extent cannot exceed 600 inches");
  return frame as ExplicitAuthoredFrame;
}
