import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {
  reviewJobTrussInspectionIntake as documentary,
  reviewJobTrussInspectionRecordBytes as review,
} from '../dist/fabrication/src/job-truss-inspection-intake.js';

const matchField='inspectionRecordBytesMatch';
function assertMatch(result, matched) {
  assert.equal(result[matchField],matched);
  assert.equal(result.status,matched?'JOB_TRUSS_INSPECTION_RECORD_BYTES_MATCH_ONLY':'HOLD_JOB_TRUSS_INSPECTION_INTAKE');
}
const hash=(bytes)=>createHash('sha256').update(bytes).digest('hex');
function fixture() {
  const bytes=new TextEncoder().encode('Synthetic private inspection artifact. Not a signature.');
  const identity={jobId:'PRIVATE-job',trussId:'PRIVATE-truss',designRevision:'PRIVATE-r4',
    designArtifactSha256:'a'.repeat(64),plantRecordId:'PRIVATE-plant',lineSetupId:'PRIVATE-line',shiftId:'PRIVATE-shift'};
  const record={inspectionRecordId:'PRIVATE-inspection',signedRecordSha256:hash(bytes),signatureRecordId:'PRIVATE-signature'};
  const criticalJoints=[{jointId:'PRIVATE-joint',method:'plate-placement'}];
  const preliminary=['face-a','face-b'].map(face=>({face,recordId:'PRIVATE-pre-'+face,outcome:'reported-ok'}));
  const detailed=['face-a','face-b'].map(face=>({
    ...criticalJoints[0],face,recordId:'PRIVATE-detail-'+face,outcome:'reported-ok',toothCount:'not-applicable',
  }));
  return {intake:{expected:{identity,record,criticalJoints},supplied:{identity:{...identity},record:{...record},
    correctionStatus:'none-required',preliminary,detailed}},
  artifact:{inspectionRecordId:record.inspectionRecordId,designRevision:identity.designRevision,bytes}};
}
function assertPrivateAndHeldAuthority(result,input) {
  for(const flag of ['plantCredentialVerified','signatureVerified','physicalInspectionVerified','repairClosureVerified',
    'structuralAdequacyVerified','shippingAuthorized','fabricationAuthorized','machineReleaseAuthorized']) assert.equal(result[flag],false,flag);
  const json=JSON.stringify(result);
  assert.doesNotMatch(json,/PRIVATE|Synthetic private|secret[./:]|getter ran/);
  assert.ok(!json.includes(input.intake.expected.record.signedRecordSha256));
  assert.ok(!json.includes(input.intake.expected.identity.designArtifactSha256));
}

test('valid in-memory bytes match only the expected record; the legacy intake stays documentary',async()=>{
  const input=fixture();
  const before=documentary(input.intake);
  assert.equal(before.status,'DOCUMENTED_JOB_TRUSS_REVIEW_ONLY');
  const matched=await review(input);
  assertMatch(matched,true);
  assertPrivateAndHeldAuthority(matched,input);
  const after=documentary(input.intake);
  assert.deepEqual(after,before);
  assert.equal(Object.hasOwn(after,matchField),false);
  assert.equal(documentary({...input.intake,artifact:input.artifact}).status,'HOLD_JOB_TRUSS_INSPECTION_INTAKE');
  assert.equal(documentary({...input.intake,[matchField]:true}).status,'HOLD_JOB_TRUSS_INSPECTION_INTAKE');
});

test('fails closed for mismatched records, unverified corrections, and untrusted byte shapes without leak',async()=>{
  let getters=0;
  const mutate=[
    i=>{i.artifact.bytes[0]^=1;},
    i=>{i.artifact.inspectionRecordId='PRIVATE-other';},
    i=>{i.artifact.designRevision='PRIVATE-r3';},
    i=>{i.intake.supplied.correctionStatus='reported-closed';},
    i=>{i.artifact.path='/secret/file.pdf';},
    i=>{i.artifact.url='https://secret.invalid/inspection';},
    i=>{i.artifact.bytes='https://secret.invalid/inspection';},
    i=>{i[matchField]=true;},
    i=>{i.artifact.bytes=new Uint8Array(0);},
    i=>{structuredClone(i.artifact.bytes.buffer,{transfer:[i.artifact.bytes.buffer]});},
    i=>{Object.defineProperty(i.artifact,'bytes',{enumerable:true,get(){getters++;throw new Error('getter ran');}});},
    i=>{Object.defineProperty(i,'artifact',{enumerable:true,get(){getters++;throw new Error('getter ran');}});},
    i=>{i.artifact=new Proxy(i.artifact,{ownKeys(){throw new Error('/secret/unreadable');}});},
  ];
  for(const alter of mutate) {
    const input=fixture();
    alter(input);
    const result=await review(input);
    assertMatch(result,false);
    assertPrivateAndHeldAuthority(result,input);
  }
  assert.equal(getters,0);
});

test('a digest rejection fails closed without using a URL or reporting the original error',async t=>{
  let reads=0;
  t.mock.method(globalThis,'fetch',()=>{reads++;throw new Error('secret.fetch');});
  const digest=t.mock.method(globalThis.crypto.subtle,'digest',async()=>{
    throw new Error('secret.digest');
  });
  const input=fixture();
  const result=await review(input);
  assertMatch(result,false);
  assertPrivateAndHeldAuthority(result,input);
  assert.equal(digest.mock.callCount(),1);
  assert.equal(reads,0);
});
