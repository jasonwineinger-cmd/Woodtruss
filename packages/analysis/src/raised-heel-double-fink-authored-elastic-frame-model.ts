import { generateRaisedHeelDoubleFinkTopology } from "../../geometry/src/raised-heel-double-fink-topology.js";
import { bindDirectedAuthoredFrame } from "./directed-authored-frame-binding.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";

const fail = (message: string) => new Error(`Raised-heel Double-Fink frame: ${message}`);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function parseRoof(value: unknown) {
  if (!record(value)) throw fail("an exact raised-heel Double-Fink roof is required");
  const keys = ["family", "spanFt", "pitchRisePer12", "heelHeightIn"];
  const hasOverhang = Object.hasOwn(value, "overhangIn");
  if (hasOverhang) keys.push("overhangIn");
  const { family, spanFt, pitchRisePer12, heelHeightIn, overhangIn } = value;
  if (!exact(value, keys) || family !== "common" || !finite(spanFt) || !finite(pitchRisePer12) ||
      !finite(heelHeightIn) || heelHeightIn < 1 || heelHeightIn > 48) {
    throw fail("exact finite Double-Fink common roof fields and a 1–48 in heel are required; bottom pitch is not supported");
  }
  if (hasOverhang && overhangIn !== 0) throw fail("overhang must be absent or explicitly zero");
  return { family, spanFt, pitchRisePer12, heelHeightIn, ...(hasOverhang ? { overhangIn: 0 } : {}) } as const;
}

/** Bind explicit directed assignments to the dedicated raised-heel Double-Fink schematic.
 * HL/HE remain separate top heel joints; only the actual L/E nodes can carry
 * authored supports. This adapter neither solves nor approves the model. */
export function buildRaisedHeelDoubleFinkAuthoredElasticFrameModel(input: unknown) {
  let data: unknown;
  try { data = snapshotElasticFrameReviewData(input); }
  catch { throw fail("exact bounded plain model data required"); }
  if (!exact(data, ["roof", "memberAssignments", "supports"])) throw fail("exact model input fields required");
  const roof = parseRoof(data.roof);
  let topology: ReturnType<typeof generateRaisedHeelDoubleFinkTopology>;
  try { topology = generateRaisedHeelDoubleFinkTopology(roof); }
  catch (error) { throw fail(error instanceof Error ? error.message : "raised-heel topology could not be generated"); }
  return bindDirectedAuthoredFrame(topology, data.memberAssignments, data.supports, fail);
}
