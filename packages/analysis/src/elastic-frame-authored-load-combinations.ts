import {
  combineElasticFrameAuthoredActions,
  type ElasticFrameAuthoredActions,
} from "./elastic-frame-combine-authored-actions.js";

export type AuthoredElasticFrameLoadSource = ElasticFrameAuthoredActions & {
  caseId: string;
  sourceRef: string;
};
export type AuthoredElasticFrameLoadCombination = {
  caseId: string;
  sourceRef: string;
  terms: readonly { caseId: string; factor: number }[];
};
export type AuthoredElasticFrameLoadCombinationsInput = {
  modelId: string;
  modelRevision: string;
  sources: readonly AuthoredElasticFrameLoadSource[];
  combinations: readonly AuthoredElasticFrameLoadCombination[];
};
const MAX_CASES = 16;
const sourceRequired = ["caseId", "sourceRef", "loads"];
const sourceOptions = ["memberLoads", "memberPointLoads"];
const id = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(value);
const reference = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 1_000 && Boolean(value.trim());
const exact = (value: unknown, keys: readonly string[]) =>
  !!value && typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) &&
  Reflect.ownKeys(value).length === keys.length &&
  keys.every(key => Object.prototype.propertyIsEnumerable.call(value, key));
const dense = (rows: unknown) =>
  Array.isArray(rows) && rows.length > 0 && rows.length <= MAX_CASES &&
  Reflect.ownKeys(rows).length === rows.length + 1 && Array.from(rows).every((_, i) => Object.hasOwn(rows, i));

function hasNonzeroAction(actions: ElasticFrameAuthoredActions) {
  return actions.loads.some(row => row.fxLb !== 0 || row.fyLb !== 0 || row.momentLbIn !== 0) ||
    actions.memberLoads?.some(row => row.qxLbPerIn !== 0 || row.qyLbPerIn !== 0) ||
    actions.memberPointLoads?.some(row => row.fxLb !== 0 || row.fyLb !== 0);
}

/** Prepare explicit signed linear combinations with authored references.
 * References are retained as receipts, not independently verified. No
 * implicit loads/factors, frame computation, code combinations or approval. */
export function buildAuthoredElasticFrameLoadCombinations(input: AuthoredElasticFrameLoadCombinationsInput) {
  if (!exact(input, ["modelId", "modelRevision", "sources", "combinations"]) ||
      !id(input.modelId) || !id(input.modelRevision)) {
    throw new Error("Exact authored frame load combination model identity and fields are required");
  }
  const { modelId, modelRevision, sources, combinations } = input;
  if (!dense(sources) || !dense(combinations)) {
    throw new Error("One to 16 explicit source cases and combinations are required");
  }
  const byCase = new Map<string, { sourceRef: string; actions: ElasticFrameAuthoredActions }>();
  for (const source of sources) {
    if (!exact(source, [...sourceRequired, ...sourceOptions.filter(key => source && Object.hasOwn(source, key))]) ||
        !id(source.caseId) || !reference(source.sourceRef) || byCase.has(source.caseId)) {
      throw new Error("Unique source case IDs, explicit source references and exact source action fields are required");
    }
    const { caseId, sourceRef, ...actions } = source;
    // The same strict action combiner validates each source independently,
    // including sources that no combination ultimately references.
    const checked = combineElasticFrameAuthoredActions([{ ...actions, factor: 1 }]);
    if (!hasNonzeroAction(checked)) throw new Error(`Source case ${caseId} contains no nonzero action`);
    // Retain authored rows for combination conflict checks, including zero
    // rows whose explicit basis or station still has meaning.
    byCase.set(caseId, { sourceRef, actions });
  }

  const combinationIds = new Set<string>();
  const cases: ({ caseId: string } & ElasticFrameAuthoredActions)[] = [];
  const provenance: { caseId: string; sourceRef: string; terms: { caseId: string; sourceRef: string; factor: number }[] }[] = [];
  for (const combination of combinations) {
    if (!exact(combination, ["caseId", "sourceRef", "terms"]) || !id(combination.caseId) ||
        !reference(combination.sourceRef) || combinationIds.has(combination.caseId) ||
        byCase.has(combination.caseId) || !dense(combination.terms)) {
      throw new Error("Unique combination case IDs, explicit source references and one to 16 terms are required");
    }
    const { caseId, sourceRef, terms } = combination;
    const seen = new Set<string>();
    const bindings = terms.map(term => {
      if (!exact(term, ["caseId", "factor"]) || !id(term.caseId) || !Number.isFinite(term.factor) ||
          term.factor === 0 || seen.has(term.caseId)) {
        throw new Error("Each combination term needs a unique source case ID and an explicit finite nonzero factor");
      }
      const source = byCase.get(term.caseId);
      if (!source) throw new Error(`Unknown source case ${term.caseId} in combination ${caseId}`);
      seen.add(term.caseId);
      return { caseId: term.caseId, sourceRef: source.sourceRef, factor: term.factor, actions: source.actions };
    });
    const actions = combineElasticFrameAuthoredActions(bindings.map(row => ({ ...row.actions, factor: row.factor })));
    if (!hasNonzeroAction(actions)) throw new Error(`Combination ${caseId} contains no nonzero action`);
    cases.push({ caseId, ...actions });
    provenance.push({ caseId, sourceRef, terms: bindings.map(({ caseId, sourceRef, factor }) => ({ caseId, sourceRef, factor })) });
    combinationIds.add(caseId);
  }
  return { modelId, modelRevision, cases, provenance,
    status: "PRELIMINARY_NOT_ENGINEERED" as const, fabricationAuthorized: false as const };
}
