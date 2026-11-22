import { generateMonoTopology } from "../../geometry/src/mono.js";
import { bindDirectedAuthoredFrame } from "./directed-authored-frame-binding.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";

const fail = (message: string) => new Error(`Mono frame: ${message}`);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function parseRoof(value: unknown) {
  if (!record(value)) throw fail("an exact mono roof is required");
  const fields = ["family", "spanFt", "pitchRisePer12"];
  const hasHeel = Object.hasOwn(value, "heelHeightIn"), hasOverhang = Object.hasOwn(value, "overhangIn");
  if (hasHeel) fields.push("heelHeightIn");
  if (hasOverhang) fields.push("overhangIn");
  const { family, spanFt, pitchRisePer12, heelHeightIn, overhangIn } = value;
  if (!exact(value, fields) || family !== "mono" || !finite(spanFt) || !finite(pitchRisePer12)) {
    throw fail("exact finite mono roof fields required; bottom pitch is not supported");
  }
  if ((hasHeel && heelHeightIn !== 0) || (hasOverhang && overhangIn !== 0)) {
    throw fail("raised heels and overhangs must be absent or explicitly zero");
  }
  return { family, spanFt, pitchRisePer12,
    ...(hasHeel ? { heelHeightIn: 0 } : {}), ...(hasOverhang ? { overhangIn: 0 } : {}) } as const;
}

/** Bind explicit directed member properties and bearing restraints to the
 * existing mono schematic. The adapter does not infer assignments, solve
 * the model, or establish structural or fabrication approval. */
export function buildMonoAuthoredElasticFrameModel(input: unknown) {
  let data: unknown;
  try { data = snapshotElasticFrameReviewData(input); }
  catch { throw fail("exact bounded plain model data required"); }
  if (!exact(data, ["roof", "memberAssignments", "supports"])) throw fail("exact model input fields required");
  const roof = parseRoof(data.roof);
  let topology: ReturnType<typeof generateMonoTopology>;
  try { topology = generateMonoTopology(roof); }
  catch (error) { throw fail(error instanceof Error ? error.message : "mono topology could not be generated"); }
  return bindDirectedAuthoredFrame(topology, data.memberAssignments, data.supports, fail);
}
