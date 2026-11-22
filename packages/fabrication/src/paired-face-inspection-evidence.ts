type InspectionFace="face-a"|"face-b";
type InspectionMethod="plate-placement"|"tooth-count";
type InspectionOutcome="reported-ok"|"reported-discrepancy";
export interface InspectionJointExpectation {
  jointId:string;
  method:InspectionMethod;
}
export interface InspectionPreliminaryFace {
  face:InspectionFace;
  recordId:string;
  outcome:InspectionOutcome;
}
export interface InspectionDetailedFace extends InspectionJointExpectation,InspectionPreliminaryFace {
  toothCount:"not-applicable"|InspectionOutcome;
}
const text=(value:unknown):value is string=>typeof value==="string"&&value.length>0&&value.length<=240&&value.trim()===value;
const method=(value:unknown):value is InspectionMethod=>value==="plate-placement"||value==="tooth-count";
const face=(value:unknown):value is InspectionFace=>value==="face-a"||value==="face-b";
const outcome=(value:unknown):value is InspectionOutcome=>value==="reported-ok"||value==="reported-discrepancy";

function ownData(value:object,key:string){
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  return descriptor?.enumerable&&Object.hasOwn(descriptor,"value")?descriptor.value as unknown:undefined;
}
function record<K extends string>(value:unknown,keys:readonly K[]):Record<K,unknown>|null{
  if(!value||typeof value!=="object"||Array.isArray(value)||
    (Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)||
    Reflect.ownKeys(value).length!==keys.length)return null;
  const entries=keys.map(key=>[key,ownData(value,key)] as const);
  if(entries.some(([,data])=>data===undefined))return null;
  return Object.fromEntries(entries) as Record<K,unknown>;
}
function dense(value:unknown,min:number,max:number) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)return null;
  const length=Object.getOwnPropertyDescriptor(value,"length")?.value;
  if(!Number.isSafeInteger(length)||length<min||length>max||Reflect.ownKeys(value).length!==length+1)return null;
  const rows=Array.from({length},(_,index)=>ownData(value,String(index)));
  return rows.every(row=>row!==undefined)?rows:null;
}

function coverage(
  expectedInput:unknown,preliminaryInput:unknown,detailedInput:unknown,
):string[]{
  const expected=dense(expectedInput,1,128);
  if(!expected)return ["One to 128 explicit expected inspection joints are required."];
  const preliminary=dense(preliminaryInput,2,2),detailed=dense(detailedInput,expected.length*2,expected.length*2);
  if(!preliminary||!detailed)return ["Exact preliminary and detailed paired-face record counts are required."];
  const jointMethods=new Map<string,InspectionMethod>();
  for(const item of expected){
    const row=record(item,["jointId","method"]);
    if(!row||!text(row.jointId)||!method(row.method)||jointMethods.has(row.jointId))
      return ["Expected joint identities and methods must be exact and distinct."];
    jointMethods.set(row.jointId,row.method);
  }

  let discrepancy=false;
  const ids=new Set<string>(),preliminaryFaces=new Set<InspectionFace>();
  for(const item of preliminary){
    const row=record(item,["face","recordId","outcome"]);
    if(!row||!face(row.face)||!text(row.recordId)||!outcome(row.outcome)||preliminaryFaces.has(row.face)||ids.has(row.recordId))
      return ["Preliminary observations must cover each face once with distinct record IDs."];
    discrepancy ||= row.outcome==="reported-discrepancy";
    ids.add(row.recordId);preliminaryFaces.add(row.face);
  }
  const detailedFaces=new Map<string,Set<InspectionFace>>();
  for(const item of detailed){
    const row=record(item,["jointId","method","face","recordId","outcome","toothCount"]);
    if(!row||!text(row.jointId)||!method(row.method)||jointMethods.get(row.jointId)!==row.method||
      !face(row.face)||!text(row.recordId)||!outcome(row.outcome)||ids.has(row.recordId))
      return ["Detailed observations must match exact expected joint methods and distinct record IDs."];
    const seen=detailedFaces.get(row.jointId)??new Set<InspectionFace>();
    if(seen.has(row.face))return ["Detailed joint observations cannot repeat a face."];
    if(row.method==="plate-placement"?row.toothCount!=="not-applicable":!outcome(row.toothCount))
      return ["Detailed tooth-count declarations do not match the expected inspection method."];
    discrepancy ||= row.outcome==="reported-discrepancy"||row.toothCount==="reported-discrepancy";
    seen.add(row.face);detailedFaces.set(row.jointId,seen);ids.add(row.recordId);
  }
  if([...jointMethods.keys()].some(id=>detailedFaces.get(id)?.size!==2))
    return ["Detailed inspection must cover both faces of every expected joint."];
  return discrepancy?["A reported discrepancy holds the paired-face documentation."]:[];
}

/** Reconcile caller-provided record coverage only. No physical verification,
 * tolerance inference, reinspection/supersession or release authority. */
export function reviewPairedFaceInspectionEvidence(
  expected:readonly InspectionJointExpectation[],
  preliminary:readonly InspectionPreliminaryFace[],
  detailed:readonly InspectionDetailedFace[],
){
  let outstanding:string[];
  try{outstanding=coverage(expected,preliminary,detailed);}
  catch{outstanding=["Paired-face inspection documentation could not be read as explicit records."];}
  return {
    status:outstanding.length?"HOLD_PAIRED_FACE_DOCUMENTATION" as const:"PAIRED_FACE_DOCUMENTATION_MATCH_ONLY" as const,
    outstanding,physicalInspectionVerified:false as const,fabricationAuthorized:false as const,
    machineReleaseAuthorized:false as const,
  };
}
