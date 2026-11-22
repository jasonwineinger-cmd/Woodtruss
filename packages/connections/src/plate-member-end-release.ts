type EndDeclaration="moment-released-idealization"|"rotation-restrained-idealization"|"not-declared";
type EndEvidence={end:"start"|"finish";jointId:string;sourceLocator:string;declaration:EndDeclaration};
export interface MemberEndReleaseEvidence {
 revision:string;
 memberId:string;
 sourceSha256:string;
 axis:"in-plane-rotation";
 ends:readonly EndEvidence[];
}
type Hold="END_EVIDENCE_UNVERIFIED"|"SOURCE_OR_MEMBER_MISMATCH"|"END_DECLARATION_MISMATCH"|"END_RELEASE_UNRESOLVED";
type Row={end:EndEvidence["end"];declaration:EndDeclaration};
function output(hold:Hold|null,rows:Row[]=[]){
 return {status:hold?"HELD_UNVERIFIED" as const:"DECLARED_RELEASE_MODEL_REVIEW_ONLY" as const,
  hold,rows,numericalStiffnessInferred:false,physicalRestraintVerified:false,capacityVerified:false,
  engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false};
}
const recordKeys=["revision","memberId","sourceSha256","axis","ends"];
const endKeys=["end","jointId","sourceLocator","declaration"];
const exact=(value:unknown,keys:readonly string[])=>typeof value==="object"&&value!==null&&
 Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const label=(x:unknown)=>typeof x==="string"&&x.length>0&&x.length<=256&&x===x.trim()&&!/[\u0000-\u001f\u007f]/u.test(x);
function validate(doc:MemberEndReleaseEvidence|null){
 if(!doc||!exact(doc,recordKeys)||!label(doc.revision)||!label(doc.memberId)||
    typeof doc.sourceSha256!=="string"||!/^[a-f0-9]{64}$/u.test(doc.sourceSha256)||
    doc.axis!=="in-plane-rotation"||!Array.isArray(doc.ends)||doc.ends.length!==2)return null;
 const byEnd=new Map<EndEvidence["end"],EndEvidence>();
 for(const row of doc.ends){
  if(!row||!exact(row,endKeys)||(row.end!=="start"&&row.end!=="finish")||byEnd.has(row.end)||
    !label(row.jointId)||!label(row.sourceLocator)||
    !["moment-released-idealization","rotation-restrained-idealization","not-declared"].includes(row.declaration))return null;
  byEnd.set(row.end,row);
 }
 const start=byEnd.get("start")!,finish=byEnd.get("finish")!;
 return start.jointId===finish.jointId?null:[start,finish];
}

/** Reconcile a source's explicitly declared in-plane modeling idealizations
 * with independently expected directed member ends. The declaration is not
 * physical stiffness, semi-rigid data, or permission to modify the solver. */
export function reviewMemberEndRelease(expected:MemberEndReleaseEvidence|null,supplied:MemberEndReleaseEvidence|null){
 const a=validate(expected),b=validate(supplied);
 if(!expected||!supplied||!a||!b)return output("END_EVIDENCE_UNVERIFIED");
 if(expected.revision!==supplied.revision||expected.memberId!==supplied.memberId||
    expected.sourceSha256!==supplied.sourceSha256||expected.axis!==supplied.axis)
  return output("SOURCE_OR_MEMBER_MISMATCH");
 if(a.some((end,i)=>end.jointId!==b[i].jointId||end.sourceLocator!==b[i].sourceLocator||
    end.declaration!==b[i].declaration))return output("END_DECLARATION_MISMATCH");
 const rows=a.map(({end,declaration})=>({end,declaration}));
 return output(rows.some(row=>row.declaration==="not-declared")?"END_RELEASE_UNRESOLVED":null,rows);
}
