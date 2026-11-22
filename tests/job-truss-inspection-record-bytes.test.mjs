import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { reviewJobTrussInspectionRecordBytes as review } from '../dist/fabrication/src/job-truss-inspection-intake.js';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture() {
 const identity={jobId:'Sentinel private job 27',trussId:'Sentinel private truss E2',designRevision:'R4',
  designArtifactSha256:'a'.repeat(64),plantRecordId:'Sentinel private plant credential',lineSetupId:'Sentinel private line',
  shiftId:'Sentinel private shift'};
 const bytes=new TextEncoder().encode('Synthetic binary inspection document; not a signature.');
 const record={inspectionRecordId:'Sentinel private inspection',signedRecordSha256:digest(bytes),
  signatureRecordId:'Sentinel private signature locator'};
 const criticalJoints=[{jointId:'Sentinel private joint A',method:'plate-placement'},
  {jointId:'Sentinel private joint B',method:'tooth-count'}];
 const faces=['face-a','face-b'];
 const preliminary=faces.map(face=>({face,recordId:'Sentinel private preliminary '+face,outcome:'reported-ok'}));
 const detailed=criticalJoints.flatMap(({jointId,method})=>faces.map(face=>({
  jointId,method,face,recordId:jointId+' observation '+face,outcome:'reported-ok',
  toothCount:method==='tooth-count'?'reported-ok':'not-applicable',
 })));
 const intake={expected:{identity,record,criticalJoints},supplied:{identity:{...identity},record:{...record},
  correctionStatus:'none-required',preliminary,detailed}};
 return {intake,artifact:{inspectionRecordId:record.inspectionRecordId,designRevision:identity.designRevision,bytes}};

}
function assertPrivateAndNoAuthority(result) {
 for(const flag of ['plantCredentialVerified','signatureVerified','physicalInspectionVerified','repairClosureVerified',
  'structuralAdequacyVerified','shippingAuthorized','fabricationAuthorized','machineReleaseAuthorized'])
  assert.equal(result[flag],false);
 const wire=JSON.stringify(result);
 assert.doesNotMatch(wire,/Sentinel private/);
 assert.ok(!wire.includes('a'.repeat(64)));
 assert.ok(!wire.includes(digest(fixture().artifact.bytes)));
 assert.doesNotMatch(wire,/Synthetic binary inspection document/);
}
test('matches exact revision-bound private record bytes without confirming a signature or authority',async()=>{
 const input=fixture();
 const result=await review(input);
 assert.equal(result.status,'JOB_TRUSS_INSPECTION_RECORD_BYTES_MATCH_ONLY',JSON.stringify(result.outstanding));
 assert.equal(result.inspectionRecordBytesMatch,true);
 assert.deepEqual(result.outstanding,[]);
 assertPrivateAndNoAuthority(result);
});

test('holds byte changes, copied revision and document aliases, unbound role, and corrections',async()=>{
 for(const alter of [
  i=>{i.artifact.bytes[0]^=1;},
  i=>{i.artifact.designRevision='R3';},
  i=>{i.artifact.inspectionRecordId=i.intake.expected.record.signatureRecordId;},
  i=>{i.artifact.inspectionRecordId=i.intake.expected.identity.plantRecordId;},
  i=>{i.artifact.role='design-artifact';},
  i=>{delete i.artifact.inspectionRecordId;},
  i=>{i.intake.expected.record.signedRecordSha256=i.intake.supplied.record.signedRecordSha256='b'.repeat(64);},
  i=>{i.intake.expected.identity.designArtifactSha256=i.intake.supplied.identity.designArtifactSha256=digest(i.artifact.bytes);},
  i=>{i.intake.supplied.correctionStatus='open';},
  i=>{i.intake.supplied.correctionStatus='reported-closed';},
  i=>{i.artifact.bytes=new Uint8Array();},
 ]) {
  const input=fixture();
  alter(input);
  const result=await review(input);
  assert.equal(result.status,'HOLD_JOB_TRUSS_INSPECTION_INTAKE',alter.toString());
  assert.equal(result.inspectionRecordBytesMatch,false);
  assert.ok(result.outstanding.length>0);
  assertPrivateAndNoAuthority(result);
 }
});

test('finishes from the captured request even if the caller changes scope and bytes after invocation',async()=>{
 const input=fixture();
 const pending=review(input);
 input.intake.expected.record.signedRecordSha256='b'.repeat(64);
 input.intake.supplied.correctionStatus='open';
 input.artifact.designRevision='R5';
 input.artifact.bytes.fill(0);
 const result=await pending;
 assert.equal(result.status,'JOB_TRUSS_INSPECTION_RECORD_BYTES_MATCH_ONLY');
 assert.equal(result.inspectionRecordBytesMatch,true);
 assertPrivateAndNoAuthority(result);
 assert.equal((await review(input)).inspectionRecordBytesMatch,false);
});
