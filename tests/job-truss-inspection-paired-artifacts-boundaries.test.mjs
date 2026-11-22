import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { reviewJobTrussInspectionPairedArtifactBytes as review } from '../dist/fabrication/src/job-truss-inspection-paired-artifacts.js';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture() {
 const designBytes=new TextEncoder().encode('Synthetic private design body; not an approved drawing.');
 const identity={jobId:'Sentinel private job 27',trussId:'Sentinel private truss E2',designRevision:'R4',
  designArtifactSha256:digest(designBytes),plantRecordId:'Sentinel private plant credential',lineSetupId:'Sentinel private line',
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
 const expectedDesignArtifactId='Sentinel private design';
 return {intake,expectedDesignArtifactId,
  designArtifact:{designArtifactId:expectedDesignArtifactId,designRevision:identity.designRevision,bytes:designBytes},
  inspectionArtifact:{inspectionRecordId:record.inspectionRecordId,designRevision:identity.designRevision,bytes}};

}
function assertPrivateAndNoAuthority(result) {
 for(const flag of ['plantCredentialVerified','signatureVerified','physicalInspectionVerified','repairClosureVerified',
  'structuralAdequacyVerified','shippingAuthorized','fabricationAuthorized','machineReleaseAuthorized'])
  assert.equal(result[flag],false);
 const wire=JSON.stringify(result);
 assert.doesNotMatch(wire,/Sentinel private/);
 const original=fixture();
 assert.ok(!wire.includes(digest(original.designArtifact.bytes)));
 assert.ok(!wire.includes(digest(original.inspectionArtifact.bytes)));
 assert.doesNotMatch(wire,/Synthetic binary inspection document|Synthetic private design body/);
}
test('matches both local roles only when independently identified and hides all evidence', async () => {
 const result=await review(fixture());
 assert.equal(result.designArtifactBytesMatch,true);
 assert.equal(result.inspectionRecordBytesMatch,true);
 assert.deepEqual(result.outstanding,[]);
 assertPrivateAndNoAuthority(result);
});

test('holds either bad artifact, stale identity or an alias without crediting only one role',async()=>{
 for(const alter of [
  input=>{input.designArtifact.designArtifactId='Sentinel private fake design';},
  input=>{input.expectedDesignArtifactId=input.designArtifact.designArtifactId=input.intake.expected.record.inspectionRecordId;},
  input=>{input.expectedDesignArtifactId=input.designArtifact.designArtifactId=input.intake.expected.record.signatureRecordId;},
  input=>{input.designArtifact.designRevision='R3';},
  input=>{input.inspectionArtifact.designRevision='R3';},
  input=>{[input.designArtifact.bytes,input.inspectionArtifact.bytes]=[input.inspectionArtifact.bytes,input.designArtifact.bytes];},
  input=>{input.designArtifact.bytes[0]^=1;},
  input=>{input.inspectionArtifact.bytes[0]^=1;},
  input=>{input.intake.expected.identity.designArtifactSha256=input.intake.supplied.identity.designArtifactSha256='b'.repeat(64);},
  input=>{input.intake.expected.record.signedRecordSha256=input.intake.supplied.record.signedRecordSha256='b'.repeat(64);},
  input=>{input.intake.supplied.correctionStatus='reported-closed';},
  input=>{input.designArtifact.approvedForFabrication=true;},
  input=>{input.inspectionArtifact.bytes=new Uint8Array(new SharedArrayBuffer(4));},
 ]) {
  const input=fixture();
  alter(input);
  const result=await review(input);
  assert.equal(result.designArtifactBytesMatch,false,alter.toString());
  assert.equal(result.inspectionRecordBytesMatch,false,alter.toString());
  assert.ok(result.outstanding.length>0);
  assertPrivateAndNoAuthority(result);
 }
});

test('holds accessor-carried data without calling the accessor or echoing its content', async () => {
 const input=fixture();
 let reads=0;
 Object.defineProperty(input.designArtifact,'designArtifactId',{enumerable:true,get(){
  reads++;
  throw new Error('Sentinel private throwing accessor');
 }});
 const result=await review(input);
 assert.equal(reads,0);
 assert.equal(result.designArtifactBytesMatch,false);
 assert.equal(result.inspectionRecordBytesMatch,false);
 assertPrivateAndNoAuthority(result);
});
