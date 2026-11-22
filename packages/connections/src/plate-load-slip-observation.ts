type Scope={observationId:string;revision:string;jointId:string;axisId:string;forceUnit:"lb";slipUnit:"in"};
type Sample={forceLb:number;slipIn:number};
export interface LoadSlipObservation extends Scope {
 /** Exact observed samples in acquisition order, with unload back to zero. */
 increasing:readonly Sample[];
 decreasing:readonly Sample[];
}
type Hold="SCOPE_UNVERIFIED"|"OBSERVATIONS_UNVERIFIED"|"NUMERIC_COMPARISON_UNVERIFIED";
type Row={forceLb:number;increasingSlipIn:number;decreasingSlipIn:number;
 observedReturnDeltaIn:number;increasingResidualFromChordIn:number;decreasingResidualFromChordIn:number};
function result(hold:Hold|null,rows:Row[]=[],returnSlipDeltaIn:number|null=null){
 return {status:hold?"HELD_UNVERIFIED" as const:"OBSERVED_LOAD_SLIP_REVIEW_ONLY" as const,
  hold,rows,returnSlipDeltaIn,
  interpolationBasis:"chord through first and last increasing observations, evaluated only at recorded loads" as const,
  reversibleBehaviorProven:false,stiffnessVerified:false,capacityVerified:false,
  engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false};
}
const text=(x:unknown)=>typeof x==="string"&&x.trim().length>0&&x===x.trim();
const sample=(p:Sample)=>p&&Number.isFinite(p.forceLb)&&Number.isFinite(p.slipIn);
const zero=(n:number)=>n===0?0:n;

/** Review one synthetic or observer-supplied nonnegative force excursion and
 * return, on matching exact force stations only. This makes no claim that
 * observed response is elastic, linear, reversible, transferable, or approved. */
export function reviewLoadSlipObservation(expected:Scope,observation:LoadSlipObservation|null){
 if(!observation||![expected.observationId,expected.revision,expected.jointId,expected.axisId].every(text)||
    expected.forceUnit!=="lb"||expected.slipUnit!=="in"||
    observation.observationId!==expected.observationId||observation.revision!==expected.revision||
    observation.jointId!==expected.jointId||observation.axisId!==expected.axisId||
    observation.forceUnit!==expected.forceUnit||observation.slipUnit!==expected.slipUnit)
  return result("SCOPE_UNVERIFIED");
 const {increasing,decreasing}=observation;
 if(!Array.isArray(increasing)||!Array.isArray(decreasing)||increasing.length<3||increasing.length>500||
    increasing.length!==decreasing.length||![...increasing].every(sample)||![...decreasing].every(sample)||
    increasing[0].forceLb!==0||increasing.some((p,i)=>i>0&&p.forceLb<=increasing[i-1].forceLb)||
    decreasing.some((p,i)=>p.forceLb!==increasing[increasing.length-1-i].forceLb))
  return result("OBSERVATIONS_UNVERIFIED");
 const first=increasing[0],last=increasing[increasing.length-1];
 if(last.slipIn!==decreasing[0].slipIn)return result("OBSERVATIONS_UNVERIFIED");
 const span=last.slipIn-first.slipIn;
 if(!Number.isFinite(span))return result("NUMERIC_COMPARISON_UNVERIFIED");
 const rows:Row[]=[];
 for(const [i,current] of increasing.entries()){
  const other=decreasing[decreasing.length-1-i];
  const chord=i===0?first.slipIn:i===increasing.length-1?last.slipIn:first.slipIn+span*(current.forceLb/last.forceLb);
  const observedReturnDeltaIn=zero(other.slipIn-current.slipIn);
  const increasingResidualFromChordIn=zero(current.slipIn-chord);
  const decreasingResidualFromChordIn=zero(other.slipIn-chord);
  if(![chord,observedReturnDeltaIn,increasingResidualFromChordIn,decreasingResidualFromChordIn].every(Number.isFinite))
   return result("NUMERIC_COMPARISON_UNVERIFIED");
  rows.push({forceLb:zero(current.forceLb),increasingSlipIn:zero(current.slipIn),decreasingSlipIn:zero(other.slipIn),
   observedReturnDeltaIn,increasingResidualFromChordIn,decreasingResidualFromChordIn});
 }
 return result(null,rows,rows[0].observedReturnDeltaIn);
}
