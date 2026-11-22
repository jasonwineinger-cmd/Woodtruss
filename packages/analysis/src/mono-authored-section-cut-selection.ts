import type { ElasticFrameSectionDemandCut } from "./elastic-frame-section-demand.js";
import type { buildMonoAuthoredElasticFrameModel } from "./mono-authored-elastic-frame-model.js";

type Frame = ReturnType<typeof buildMonoAuthoredElasticFrameModel>;
type MemberCuts = {
  memberId: string; startNodeId: string; endNodeId: string; cuts: ElasticFrameSectionDemandCut[];
};
type CaseCuts = { caseId: string; memberCuts: MemberCuts[] };
const fail = (message: string) => new Error(`Mono section-cut selection: ${message}`);
const ownData = (value: object, key: PropertyKey) => {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return !!descriptor?.enumerable && Object.hasOwn(descriptor, "value");
};
const exact = <K extends string>(value: unknown, keys: readonly K[]): value is Record<K, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) &&
  Reflect.ownKeys(value).length === keys.length && keys.every(key => ownData(value, key));
function dense(value: unknown, max: number): value is unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype ||
      value.length < 1 || value.length > max || Reflect.ownKeys(value).length !== value.length + 1) return false;
  for (let index = 0; index < value.length; index++) if (!ownData(value, index)) return false;
  return true;
}

/** Bind requests to exact cases and directed member stations. Actual force
 * discontinuity and valid side at interior stations are checked during each
 * case solve, not inferred here from the geometric position. */
export function bindMonoSectionCutSelection(frame: Frame, caseIds: readonly string[], caseCuts: unknown): CaseCuts[] {
  if (!dense(caseIds, 16) || !caseIds.every(id => typeof id === "string" &&
      /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(id)) || new Set(caseIds).size !== caseIds.length ||
      !dense(caseCuts, caseIds.length) || caseCuts.length !== caseIds.length) {
    throw fail("one explicit ordered selection is required for every distinct authored case");
  }
  const nodes = new Map(frame.nodes.map(node => [node.id, node]));
  const members = new Map(frame.members.map(member => [member.id, member]));
  return caseCuts.map((entry, index) => {
    const caseId = caseIds[index];
    if (!exact(entry, ["caseId", "memberCuts"]) || entry.caseId !== caseId || !dense(entry.memberCuts, members.size)) {
      throw fail("case identity and bounded member cuts must match authored case order");
    }
    const seenMembers = new Set<string>();
    const memberCuts = entry.memberCuts.map((selection): MemberCuts => {
      if (!exact(selection, ["memberId", "startNodeId", "endNodeId", "cuts"]))
        throw fail("exact directed member-cut fields required");
      const { memberId, startNodeId, endNodeId, cuts } = selection;
      const member = typeof memberId === "string" ? members.get(memberId) : undefined;
      if (typeof memberId !== "string" || !member || seenMembers.has(memberId) ||
          startNodeId !== member.startNodeId || endNodeId !== member.endNodeId)
        throw fail("member identity and directed endpoints must match one distinct authored member");
      seenMembers.add(memberId);
      const a = nodes.get(member.startNodeId), b = nodes.get(member.endNodeId);
      if (!a || !b) throw fail("directed member endpoints are not modeled");
      const lengthIn = Math.hypot(b.xIn - a.xIn, b.yIn - a.yIn);
      if (!Number.isFinite(lengthIn) || lengthIn <= 0) throw fail("member length is not usable");
      if (!dense(cuts, 64)) throw fail("one to 64 explicit cuts are required per member");
      const seenCuts = new Set<string>();
      const selected = cuts.map((cut): ElasticFrameSectionDemandCut => {
        if (!exact(cut, ["stationIn", "side"])) throw fail("exact station and side fields required");
        const { stationIn, side } = cut;
        if (typeof stationIn !== "number" || !Number.isFinite(stationIn) || stationIn < 0 || stationIn > lengthIn ||
            (side !== "left" && side !== "right" && side !== "continuous"))
          throw fail("cut station must lie within the actual directed member with a known explicit side");
        if ((stationIn === 0 || stationIn === lengthIn) && side !== "continuous")
          throw fail("physical member endpoints require a continuous cut");
        const normalized = stationIn === 0 ? 0 : stationIn;
        const key = `${normalized}:${side}`;
        if (seenCuts.has(key)) throw fail("exact station and side pairs must be distinct");
        seenCuts.add(key);
        return { stationIn: normalized, side };
      });
      return { memberId, startNodeId: member.startNodeId, endNodeId: member.endNodeId, cuts: selected };
    });
    return { caseId, memberCuts };
  });
}
