import type {TrussModel} from "./index.js";
import type {ExplicitNodalLoadChannel} from "./load-source-aggregation.js";
import {replayAuthoredCase,type AuthoredCaseReceipt,type AuthoredCaseScope} from "./authored-case-replay.js";

export interface IndependentBenchmarkObservation {
  checkId:string;
  /** Built-in quantity names are member-axial, support-reaction-y, and joint-displacement-y. */
  quantity:string;
  targetId:string;
  unit:string;
  expectedValue:number;
  absoluteTolerance:number;
  sourceReference:string;
}
export interface ExpectedAuthoredCaseBenchmark {
  scope:AuthoredCaseScope;
  observations:readonly IndependentBenchmarkObservation[];
}
const text=(value:string)=>typeof value==="string"&&value.length>0&&value.trim()===value;

/** Compare independent numerical expectations against a fresh, equilibrium-
 * audited solve. The authored model/case receipt must be retrieved from a
 * trusted revision store; matching benchmark points do not validate design. */
export function compareAuthoredCaseBenchmark(expected:ExpectedAuthoredCaseBenchmark,
  receipt:AuthoredCaseReceipt,model:TrussModel,channels:readonly ExplicitNodalLoadChannel[]) {
  const checks=expected.observations;
  if(!checks.length||new Set(checks.map(c=>c.checkId)).size!==checks.length||
    checks.some(c=>![c.checkId,c.quantity,c.targetId,c.unit,c.sourceReference].every(text)||
      !Number.isFinite(c.expectedValue)||!Number.isFinite(c.absoluteTolerance)||c.absoluteTolerance<0))
    throw new Error("Independent benchmark expectations and tolerance must be complete and unique");
  const replay=replayAuthoredCase(receipt,expected.scope,model,channels);
  const {result,model:solved}=replay.case;
  const results=checks.map(check=>{
    let unit:string;
    let actual:number|undefined;
    switch(check.quantity){
      case "member-axial":
        unit="lb";
        if(solved.bars.some(bar=>bar.id===check.targetId)&&Object.hasOwn(result.axialForceLb,check.targetId))
          actual=result.axialForceLb[check.targetId];
        break;
      case "support-reaction-y":
        unit="lb";
        if(solved.supports.some(s=>s.nodeId===check.targetId&&s.fixY===true)&&Object.hasOwn(result.reactionLb,check.targetId))
          actual=result.reactionLb[check.targetId].y;
        break;
      case "joint-displacement-y":
        unit="in";
        if(solved.nodes.some(node=>node.id===check.targetId)&&Object.hasOwn(result.displacementIn,check.targetId))
          actual=result.displacementIn[check.targetId].y;
        break;
      default:
        return {...check,outcome:"HELD_UNSUPPORTED_QUANTITY" as const,actualValue:null,signedDifference:null};
    }
    if(unit!==check.unit)return {...check,outcome:"HELD_UNIT_MISMATCH" as const,actualValue:null,signedDifference:null};
    if(typeof actual!=="number"||!Number.isFinite(actual))
      return {...check,outcome:"HELD_MISSING_MODELED_RESULT" as const,actualValue:null,signedDifference:null};
    const signedDifference=actual-check.expectedValue;
    if(!Number.isFinite(signedDifference))throw new Error("Benchmark difference exceeds finite range: "+check.checkId);
    return {...check,outcome:Math.abs(signedDifference)<=check.absoluteTolerance
      ?"MATCHES_AUTHORED_EXPECTATION" as const:"NUMERICAL_MISMATCH" as const,
      actualValue:actual,signedDifference};
  });
  return {scope:replay.receipt.scope,observations:results,
    allExpectedValuesMatched:results.every(row=>row.outcome==="MATCHES_AUTHORED_EXPECTATION"),
    status:"PRELIMINARY_NOT_ENGINEERED" as const,
    codeValidated:false as const,manufacturingApproved:false as const};
}
