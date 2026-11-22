type WitnessScope={
 observationId:string;sourceSha256:string;revision:string;memberId:string;jointId:string;
 end:"start"|"finish";axisId:string;positiveRotation:"clockwise"|"counterclockwise";
 momentUnit:"lb-in";rotationUnit:"rad";branch:"increasing-rotation"|"decreasing-rotation";
};
type Sample={sequence:number;momentLbIn:number;rotationRad:number};
export interface MomentRotationWitness extends WitnessScope {
 endpoints:readonly [Sample,Sample];
}
type Hold="WITNESS_SCOPE_UNVERIFIED"|"ENDPOINTS_UNVERIFIED"|"NUMERIC_SECANT_UNVERIFIED";
type Delta={rotationDeltaRad:number;momentDeltaLbIn:number;observedSecantLbInPerRad:number};
function result(hold:Hold|null,observed:Delta|null=null){
 return {status:hold?"HELD_UNVERIFIED" as const:"EMPIRICAL_SECANT_REVIEW_ONLY" as const,
  hold,observed,interpretation:"signed endpoint difference only in the declared observation frame" as const,
  reversibleBehaviorProven:false,designStiffnessVerified:false,capacityVerified:false,
  engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false};
}
const names=["observationId","sourceSha256","revision","memberId","jointId","end","axisId",
 "positiveRotation","momentUnit","rotationUnit","branch"] as const;
const label=(v:unknown)=>typeof v==="string"&&v.length>0&&v.length<=256&&v.trim()===v&&!/[\u0000-\u001f\u007f]/u.test(v);
const exact=(v:unknown,fields:readonly string[])=>typeof v==="object"&&v!==null&&Object.keys(v).length===fields.length&&
 fields.every(field=>Object.hasOwn(v,field));
const finiteSample=(value:Sample)=>exact(value,["sequence","momentLbIn","rotationRad"])&&
 Number.isSafeInteger(value.sequence)&&value.sequence>=0&&Number.isFinite(value.momentLbIn)&&Number.isFinite(value.rotationRad);
const zero=(n:number)=>n===0?0:n;

/** Compute an empirical secant between only two explicitly measured endpoints.
 * No interpolation, load-path inference, additional degrees of freedom, or
 * use as physical or design stiffness. Moment signs are retained as supplied. */
export function reviewMomentRotationWitness(scope:WitnessScope|null,witness:MomentRotationWitness|null){
 if(!scope||!witness||!exact(scope,names)||!exact(witness,[...names,"endpoints"])||
    names.some(name=>!label(scope[name])||scope[name]!==witness[name])||
    !/^[0-9a-f]{64}$/u.test(scope.sourceSha256)||(scope.end!=="start"&&scope.end!=="finish")||
    (scope.positiveRotation!=="clockwise"&&scope.positiveRotation!=="counterclockwise")||
    scope.momentUnit!=="lb-in"||scope.rotationUnit!=="rad"||
    (scope.branch!=="increasing-rotation"&&scope.branch!=="decreasing-rotation"))
  return result("WITNESS_SCOPE_UNVERIFIED");
 if(!Array.isArray(witness.endpoints)||witness.endpoints.length!==2)return result("ENDPOINTS_UNVERIFIED");
 const [first,last]=witness.endpoints;
 if(!finiteSample(first)||!finiteSample(last)||last.sequence<=first.sequence)return result("ENDPOINTS_UNVERIFIED");
 const rotationDeltaRad=zero(last.rotationRad-first.rotationRad);
 const momentDeltaLbIn=zero(last.momentLbIn-first.momentLbIn);
 if(!Number.isFinite(rotationDeltaRad)||!Number.isFinite(momentDeltaLbIn))return result("NUMERIC_SECANT_UNVERIFIED");
 if(rotationDeltaRad===0||(scope.branch==="increasing-rotation")!==(rotationDeltaRad>0))
  return result("ENDPOINTS_UNVERIFIED");
 const observedSecantLbInPerRad=zero(momentDeltaLbIn/rotationDeltaRad);
 if(!Number.isFinite(observedSecantLbInPerRad))return result("NUMERIC_SECANT_UNVERIFIED");
 return result(null,{rotationDeltaRad,momentDeltaLbIn,observedSecantLbInPerRad});
}
