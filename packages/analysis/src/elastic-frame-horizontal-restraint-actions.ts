import {combineElasticFrameAuthoredActions,type ElasticFrameAuthoredActions} from "./elastic-frame-combine-authored-actions.js";
import {snapshotElasticFrameReviewData} from "./elastic-frame-reviewed-plain-data.js";

const actionKeys=["loads","memberLoads","memberPointLoads"] as const;

/** Place one signed global X force at the modeled bearing. This does not
 * choose a bearing, restraint stiffness, load intensity or design capacity. */
export function addElasticFrameHorizontalRestraintForce(
  actions:ElasticFrameAuthoredActions,
  bearingNodeId:string,
  restraintForceLb:number,
):ElasticFrameAuthoredActions {
  if(typeof bearingNodeId!=="string"||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(bearingNodeId)||
      !Number.isFinite(restraintForceLb)) {
    throw new Error("Explicit bearing ID and finite signed horizontal restraint force required");
  }
  const parsed=snapshotElasticFrameReviewData(actions);
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)||
      !Object.hasOwn(parsed,"loads")||Object.keys(parsed).some(key=>!actionKeys.some(allowed=>allowed===key))) {
    throw new Error("Exact authored restraint action fields required");
  }
  const original=parsed as ElasticFrameAuthoredActions;
  if(actionKeys.some(key=>Object.hasOwn(original,key)&&!Array.isArray(original[key]))) {
    throw new Error("Authored restraint actions must be explicit arrays");
  }
  // Existing validator holds malformed action rows and duplicate identities;
  // retain the detached original instead of its normalized combination result.
  if(original.loads.length||original.memberLoads?.length||original.memberPointLoads?.length)
    combineElasticFrameAuthoredActions([{...original,factor:1}]);
  const loads=[...original.loads];
  const index=loads.findIndex(row=>row.nodeId===bearingNodeId);
  if(index>=0){
    const authored=loads[index];
    const added=authored.fxLb+restraintForceLb;
    if(!Number.isFinite(added)||(authored.fxLb!==0&&restraintForceLb!==0&&
      (added===authored.fxLb||added===restraintForceLb||(added===0&&authored.fxLb!==-restraintForceLb)))) {
      throw new Error("Horizontal restraint action overflow or lost nonzero signed contribution");
    }
    loads[index]={...authored,fxLb:added===0?0:added};
  } else if(restraintForceLb!==0){
    if(loads.length>=50)throw new Error("Horizontal restraint action exceeds the bounded nodal row count");
    loads.push({nodeId:bearingNodeId,fxLb:restraintForceLb,fyLb:0,momentLbIn:0});
  }
  // Keep the explicit zero row after an exact cancellation: a valid
  // rigid-limit solve can balance the only authored horizontal action.
  if(!loads.length&&!original.memberLoads?.length&&!original.memberPointLoads?.length) {
    throw new Error("Horizontal restraint leaves no explicit action rows");
  }
  return {...original,loads};
}
