import { assertElasticFrameAuthoredSourceTargets } from "./elastic-frame-authored-source-targets.js";
import { buildAuthoredElasticFrameLoadCombinations, type AuthoredElasticFrameLoadCombinationsInput } from "./elastic-frame-authored-load-combinations.js";
import { snapshotElasticFrameReviewData } from "./elastic-frame-reviewed-plain-data.js";
import { solveElasticFrame, type ElasticFrameInput } from "./elastic-frame-solve.js";

const fields = ["modelId", "modelRevision", "roof", "memberAssignments", "supports", "sources", "combinations", "caseJoints"] as const;
type Scope = AuthoredElasticFrameLoadCombinationsInput & Record<typeof fields[number], unknown>;
const exact = <T extends string>(value: unknown, keys: readonly T[]): value is Record<T, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) && Reflect.ownKeys(value).length === keys.length &&
  keys.every(key => Object.prototype.propertyIsEnumerable.call(value, key));
const zero = () => ({ fxLb: 0, fyLb: 0, momentLbIn: 0 });
type Vector = ReturnType<typeof zero>;
const components = ["fxLb", "fyLb", "momentLbIn"] as const;
const clean = (value: number) => value === 0 ? 0 : value;
type FrameInputs = Pick<ElasticFrameInput, "nodes" | "members" | "supports">;

/** Shared joint ledger; callers snapshot and validate their exact authored
 * envelope, including any topology-specific binding, before entering. */
export function runAuthoredFrameJointBalance<Frame extends FrameInputs, AdditionalWarnings extends readonly string[]>(
  frame: Frame, input: AuthoredElasticFrameLoadCombinationsInput & { caseJoints: unknown },
  scope: { readonly label: string; readonly additionalWarnings: AdditionalWarnings },
) {
  const fail = (description: string) => new Error(`${scope.label} joint balance: ${description}`);
  const finite = (value: number) => {
    if (!Number.isFinite(value)) throw fail("nonfinite joint force or moment arithmetic");
    return value;
  };
  function product(value: number, multiplier: number) {
    const result = finite(value * multiplier);
    if (result === 0 && value !== 0 && multiplier !== 0) throw fail("joint force projection underflowed");
    return result;
  }
  function vector(value: Vector): Vector {
    return { fxLb: clean(finite(value.fxLb)), fyLb: clean(finite(value.fyLb)), momentLbIn: clean(finite(value.momentLbIn)) };
  }
  function residual(rows: readonly Vector[]): Vector {
    const out = zero();
    for (const key of components) {
      let sum = 0, correction = 0, scale = 0;
      for (const row of rows) {
        const term = finite(row[key]);
        const next = finite(sum + term);
        correction = finite(correction + (Math.abs(sum) >= Math.abs(term) ? (sum - next) + term : (term - next) + sum));
        sum = next;
        scale = finite(scale + Math.abs(term));
      }
      out[key] = clean(finite(sum + correction));
      if (Math.abs(out[key]) > 1e-7 * Math.max(1, scale))
        throw fail("recovered section-end actions do not balance the physical nodal force, support or moment");
    }
    return out;
  }

  const { modelId, modelRevision, sources, combinations, caseJoints } = input;
  const authored = buildAuthoredElasticFrameLoadCombinations({ modelId, modelRevision, sources, combinations });
  assertElasticFrameAuthoredSourceTargets(frame, sources);
  const nodes = new Map(frame.nodes.map(node => [node.id, node]));
  const supportIds = new Set(frame.supports.map(row => row.nodeId));
  if (!Array.isArray(caseJoints) || caseJoints.length !== authored.cases.length)
    throw fail("one explicit joint selection is required per authored case");

  const selections = authored.cases.map(({caseId}, i) => {
    const selection: unknown = caseJoints[i];
    if (!exact(selection, ["caseId", "nodeIds"]) || selection.caseId !== caseId ||
        !Array.isArray(selection.nodeIds) || !selection.nodeIds.length || selection.nodeIds.length > nodes.size)
      throw fail("selected joint list must be nonempty and match authored case order");
    const seen = new Set<string>();
    return (selection.nodeIds as unknown[]).map(id => {
      if (typeof id !== "string" || !nodes.has(id) || seen.has(id))
        throw fail("selected joints must be distinct exact modeled node IDs");
      seen.add(id);
      return id;
    });
  });

  const cases = authored.cases.map(({ caseId, ...actions }, index) => {
    const selected = selections[index], selectedIds = new Set(selected);
    const cuts = frame.members.flatMap(({id, startNodeId, endNodeId}) => {
      const start = selectedIds.has(startNodeId), end = selectedIds.has(endNodeId);
      if (!start && !end) return [];
      const a = nodes.get(startNodeId)!, b = nodes.get(endNodeId)!;
      const dx = finite(b.xIn - a.xIn), dy = finite(b.yIn - a.yIn);
      const length = finite(Math.hypot(dx, dy));
      if (length <= 0) throw fail("section endpoint distance is unusable");
      return [{memberId:id,startNodeId,endNodeId,c:dx/length,s:dy/length,
        cuts:[...(start ? [{stationIn:0,side:"continuous" as const}] : []),
          ...(end ? [{stationIn:length,side:"continuous" as const}] : [])]}];
    });
    const memberSectionCuts = cuts.map(({memberId,cuts:selectedCuts}) => ({memberId,cuts:selectedCuts}));
    const solved = solveElasticFrame({...frame,...actions,memberSectionCuts});
    type Incident = Vector & {memberId:string;startNodeId:string;endNodeId:string;at:"start"|"end"};
    const byNode = new Map(selected.map(nodeId => [nodeId, [] as Incident[]]));
    for (const {memberId,startNodeId,endNodeId,c,s,cuts:expected} of cuts) {
      const rows=solved.memberSectionDemand[memberId]?.requestedCuts;
      if (!rows || rows.length !== expected.length) throw fail("missing exact section endpoint results");
      expected.forEach(({stationIn,side}, i) => {
        const row=rows[i];
        if (row.stationIn!==stationIn || row.side!==side) throw fail("mismatched section endpoint result");
        const start = stationIn===0, sign = start?1:-1;
        // Local +x points from start to end; +y is CCW from +x. The
        // returned cut convention is member-on-start as-is, member-on-end negated.
        const recovered=vector({
          fxLb:sign*finite(product(row.axialLb,c)-product(row.shearLb,s)),
          fyLb:sign*finite(product(row.axialLb,s)+product(row.shearLb,c)),
          momentLbIn:sign*row.momentLbIn,
        });
        const incident=byNode.get(start?startNodeId:endNodeId)!;
        incident.push({memberId,startNodeId,endNodeId,at:start?"start":"end",...recovered});
      });
    }
    const nodal=new Map(actions.loads.map(row=>[row.nodeId,row]));
    const joints=selected.map(nodeId=>{
      const incident=byNode.get(nodeId)!;
      if (!incident.length) throw fail("selected modeled joint has no incident section endpoint");
      const applied=vector(nodal.get(nodeId)??zero());
      const support=supportIds.has(nodeId)?vector(solved.reactions[nodeId]):zero();
      return {nodeId,incident,applied,support,residual:residual([...incident,applied,support])};
    });
    return {caseId,joints};
  });
  return {modelId,modelRevision,frame,combinationProvenance:authored.provenance,cases,
    status:"PRELIMINARY_NOT_ENGINEERED" as const,fabricationAuthorized:false as const,
    warnings:[
      "Member-on-node forces are global X/Y and moments are positive counterclockwise. Physical member loads are already in the section-end results, not reapplied at the joint.",
      "Joint balance is not connector design, structural approval, or fabrication evidence.",
      ...scope.additionalWarnings,
    ] as const};
}

/** Preliminary 2D joint audit from actual section endpoints, not from the
 * solver's assembled member-end ledger. All moments are about the selected
 * node; no member eccentricity, connector model or release authority. */
export function studyAuthoredFrameJointBalance<
  Frame extends Pick<ElasticFrameInput, "nodes" | "members" | "supports">,
  Subtype extends string,
  AdditionalWarnings extends readonly string[],
>(
  input: unknown,
  build: (input: unknown) => Frame,
  scope: { readonly subtype: Subtype; readonly label: string; readonly additionalWarnings: AdditionalWarnings },
) {
  const data = snapshotElasticFrameReviewData(input);
  if (!exact(data, fields)) throw new Error(`${scope.label} joint balance: exact authored frame, combinations and ordered case joints are required`);
  const { modelId, modelRevision, roof, memberAssignments, supports, sources, combinations, caseJoints } = data as Scope;
  const frame = build({ roof, memberAssignments, supports });
  return {family:"common" as const,subtype:scope.subtype,
    ...runAuthoredFrameJointBalance(frame, {modelId, modelRevision, sources, combinations, caseJoints}, scope)};
}
