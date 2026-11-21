import type {TrussModel} from "./index.js";
import {analyzePinJointedTruss} from "./index.js";
import {auditGlobalEquilibrium} from "./equilibrium.js";
import {auditJointEquilibrium} from "./joint-equilibrium.js";
import {assertAuditedTrussModel} from "./model-audit.js";
import {envelopePreliminaryCases,type NamedCase,type LoadEnvelope} from "./envelope.js";
import {makeExplicitLoadCase,type ExplicitLoadCase} from "./cases.js";
import {envelopeJointDisplacements,type DisplacementEnvelope} from "./displacement-envelope.js";

export interface PreliminaryScenarioResult {
  envelope:LoadEnvelope;
  displacements:DisplacementEnvelope;
  cases:NamedCase[];
  status:"PRELIMINARY_NOT_ENGINEERED";
  warnings:string[];
}
/** Solve a collection of explicitly defined load cases using identical
 * geometry, member stiffness, and supports.
 * Not an ASCE 7 / NDS load-combination generator.
 */
export function analyzeExplicitScenarios(
  base:TrussModel,
  definitions:ExplicitLoadCase[]
):PreliminaryScenarioResult {
  if(!definitions.length)throw new Error("At least one scenario required");
  const ids=new Set<string>();
  const cases:NamedCase[]=[];
  for(const definition of definitions){
    if(ids.has(definition.id))throw new Error("Duplicate scenario ID");
    ids.add(definition.id);
    const model=makeExplicitLoadCase(base,definition);
    assertAuditedTrussModel(model);
    const result=analyzePinJointedTruss(model);
    if(!auditGlobalEquilibrium(model,result).passes)
      throw new Error("Scenario global equilibrium failed: "+definition.id);
    if(!auditJointEquilibrium(model,result.axialForceLb,result.reactionLb).passes)
      throw new Error("Scenario joint equilibrium failed: "+definition.id);
    cases.push({id:definition.id,model,result});
  }
  return {
    envelope:envelopePreliminaryCases(cases),
    displacements:envelopeJointDisplacements(cases),
    cases,
    status:"PRELIMINARY_NOT_ENGINEERED",
    warnings:["Explicit scenarios are not building-code load combinations.",
      "Lumber, connection, deflection and stability design checks remain incomplete.",
      "Manufacturing release prohibited."]
  };
}
