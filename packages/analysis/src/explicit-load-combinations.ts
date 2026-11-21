import type {TrussModel} from "./index.js";
import type {ExplicitLoadCase} from "./cases.js";
import {analyzeExplicitScenarios} from "./scenarios.js";

export interface AuthoredLoadCase extends ExplicitLoadCase {
  /** User-supplied reference; its truth is not verified by this calculation. */
  provenance:string;
}
export interface AuthoredLoadCombination {
  id:string;
  description:string;
  provenance:string;
  terms:readonly {caseId:string;factor:number}[];
}
type AuthoredTerm = AuthoredLoadCombination["terms"][number] & {caseProvenance:string};

function requiredText(value:string):boolean {
  return typeof value==="string" && value.trim().length>0;
}
function validId(value:string):boolean {
  return requiredText(value) && value===value.trim();
}

/** Superpose signed explicit joint loads on one unchanged linear model. The
 * base model's existing loads are not implicit terms. No code factors, load
 * types, exclusivity rules, or combinations are assumed. */
export function buildExplicitLoadCombinations(base:TrussModel, cases:readonly AuthoredLoadCase[],
  combinations:readonly AuthoredLoadCombination[]) {
  if (!cases.length || !combinations.length) throw new Error("At least one source case and combination required");
  const nodeIds=new Set(base.nodes.map(node=>node.id));
  if (nodeIds.size!==base.nodes.length) throw new Error("Duplicate model node ID");

  const sources=new Map<string,AuthoredLoadCase>();
  for (const source of cases) {
    if (!validId(source.id) || !requiredText(source.description) || !requiredText(source.provenance))
      throw new Error("Source case ID, description and provenance required");
    if (sources.has(source.id)) throw new Error("Duplicate source case ID: "+source.id);
    const seen=new Set<string>();
    for (const load of source.jointLoads) {
      if (!nodeIds.has(load.nodeId) || [load.fxLb,load.fyLb].some(value=>value!==undefined && !Number.isFinite(value)))
        throw new Error("Invalid source joint load: "+source.id);
      if (seen.has(load.nodeId)) throw new Error("Duplicate joint load in source case: "+source.id+" / "+load.nodeId);
      seen.add(load.nodeId);
    }
    sources.set(source.id,source);
  }

  const ids=new Set<string>();
  return combinations.map(combination=>{
    if (!validId(combination.id) || !requiredText(combination.description) || !requiredText(combination.provenance))
      throw new Error("Combination ID, description and provenance required");
    if (ids.has(combination.id) || sources.has(combination.id))
      throw new Error("Duplicate combination or source case ID: "+combination.id);
    ids.add(combination.id);
    if (!combination.terms.length) throw new Error("At least one explicit term required: "+combination.id);

    const loads=new Map<string,{fxLb:number;fyLb:number}>();
    const seen=new Set<string>();
    const terms:AuthoredTerm[]=combination.terms.map(({caseId,factor})=>{
      const source=sources.get(caseId);
      if (!source) throw new Error("Unknown source case: "+caseId);
      if (seen.has(caseId)) throw new Error("Duplicate combination term: "+caseId);
      if (!Number.isFinite(factor)) throw new Error("Nonfinite combination factor: "+caseId);
      seen.add(caseId);
      for (const load of source.jointLoads) {
        const prior=loads.get(load.nodeId)??{fxLb:0,fyLb:0};
        const fxLb=prior.fxLb+factor*(load.fxLb??0), fyLb=prior.fyLb+factor*(load.fyLb??0);
        if (!Number.isFinite(fxLb) || !Number.isFinite(fyLb))
          throw new Error("Combination joint load overflow: "+combination.id+" / "+load.nodeId);
        loads.set(load.nodeId,{fxLb,fyLb});
      }
      return {caseId,factor,caseProvenance:source.provenance};
    });
    const jointLoads=base.nodes.flatMap(({id:nodeId})=>{
      const load=loads.get(nodeId);
      return load ? [{nodeId,...load}] : [];
    });
    return {id:combination.id,description:combination.description,
      combinationProvenance:combination.provenance,terms,jointLoads};
  });
}

/** Solve and audit only these explicitly weighted cases with the existing
 * preliminary linear solver; never infer governing building-code cases. */
export function analyzeExplicitLoadCombinations(base:TrussModel,cases:readonly AuthoredLoadCase[],
  combinations:readonly AuthoredLoadCombination[]) {
  const authoredCombinations=buildExplicitLoadCombinations(base,cases,combinations);
  return {...analyzeExplicitScenarios(base,authoredCombinations),authoredCombinations};
}
