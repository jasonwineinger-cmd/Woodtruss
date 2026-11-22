import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewJobTrussInspectionIntake } from '../dist/fabrication/src/job-truss-inspection-intake.js';

function fixture() {
 const identity={jobId:'Private job 27',trussId:'Private truss E2',designRevision:'R4',
  designArtifactSha256:'a'.repeat(64),plantRecordId:'Private plant credential',lineSetupId:'Private line',
  shiftId:'Private shift'};
 const record={inspectionRecordId:'Private inspection',signedRecordSha256:'b'.repeat(64),
  signatureRecordId:'Private signature locator'};
 const criticalJoints=[{jointId:'Private joint A',method:'plate-placement'},
  {jointId:'Private joint B',method:'tooth-count'}];
 const faces=['face-a','face-b'];
 const preliminary=faces.map(face=>({face,recordId:'Private preliminary '+face,outcome:'reported-ok'}));
 const detailed=criticalJoints.flatMap(({jointId,method})=>faces.map(face=>({
  jointId,method,face,recordId:jointId+' observation '+face,outcome:'reported-ok',
  toothCount:method==='tooth-count'?'reported-ok':'not-applicable',
 })));
 return {expected:{identity,record,criticalJoints},supplied:{identity:{...identity},record:{...record},
  correctionStatus:'none-required',preliminary,detailed}};
}
function assertPrivateAndNoAuthority(result) {
 for(const flag of ['plantCredentialVerified','signatureVerified','physicalInspectionVerified','repairClosureVerified',
  'structuralAdequacyVerified','shippingAuthorized','fabricationAuthorized','machineReleaseAuthorized'])
  assert.equal(result[flag],false);
 const wire=JSON.stringify(result);
 assert.doesNotMatch(wire,/Private/);
 assert.ok(!wire.includes('a'.repeat(64)));
 assert.ok(!wire.includes('b'.repeat(64)));
}
test('matches independently expected exact job, separate signed document, and both faces without verifying inspection',()=>{
 const input=fixture();
 input.supplied.detailed.reverse();
 const result=reviewJobTrussInspectionIntake(input);
 assert.equal(result.status,'DOCUMENTED_JOB_TRUSS_REVIEW_ONLY',JSON.stringify(result.outstanding));
 assert.deepEqual(result.outstanding,[]);
 assertPrivateAndNoAuthority(result);
});
test('holds stale same-mark jobs, repeated document roles, and unverified correction closure',()=>{
 for(const alter of [
  i=>{i.supplied.identity.jobId='Other private job';},
  i=>{i.supplied.identity.designRevision='R3';},
  i=>{i.supplied.identity.designArtifactSha256='c'.repeat(64);},
  i=>{i.supplied.identity.shiftId='Different shift';},
  i=>{i.supplied.identity.approved=true;},
  i=>{i.supplied.fabricationAuthorized=true;},
  i=>{i.supplied.record.signatureRecordId='Other private signature';},
  i=>{i.expected.record.signedRecordSha256=i.supplied.record.signedRecordSha256=i.expected.identity.designArtifactSha256;},
  i=>{i.supplied.correctionStatus='open';},
  i=>{i.supplied.correctionStatus='reported-closed';},
  i=>{i.supplied.preliminary.pop();},
  i=>{i.supplied.detailed.pop();},
 ]) {
  const input=fixture();
  alter(input);
  const result=reviewJobTrussInspectionIntake(input);
  assert.equal(result.status,'HOLD_JOB_TRUSS_INSPECTION_INTAKE');
  assert.ok(result.outstanding.length>0);
  assertPrivateAndNoAuthority(result);
 }
});
