import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewJobTrussInspectionPairedArtifactBytes as review }
  from '../dist/fabrication/src/job-truss-inspection-paired-artifacts.js';

// Known SHA-256 vectors for synthetic ASCII "abc" and "hello".
const designSha='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const recordSha='2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';
function fixture() {
  const identity={jobId:'Synthetic job',trussId:'Synthetic truss',designRevision:'R4',
    designArtifactSha256:designSha,plantRecordId:'Synthetic plant',lineSetupId:'Synthetic line',shiftId:'Synthetic shift'};
  const record={inspectionRecordId:'Synthetic inspection',signedRecordSha256:recordSha,signatureRecordId:'Synthetic signature'};
  const criticalJoints=[{jointId:'Synthetic joint',method:'plate-placement'}];
  const faces=['face-a','face-b'];
  const preliminary=faces.map(face=>({face,recordId:'Synthetic preliminary '+face,outcome:'reported-ok'}));
  const detailed=faces.map(face=>({jointId:criticalJoints[0].jointId,method:'plate-placement',face,
    recordId:'Synthetic detail '+face,outcome:'reported-ok',toothCount:'not-applicable'}));
  return {
    intake:{expected:{identity,record,criticalJoints},supplied:{identity:{...identity},record:{...record},
      correctionStatus:'none-required',preliminary,detailed}},
    expectedDesignArtifactId:'Synthetic design',
    designArtifact:{designArtifactId:'Synthetic design',designRevision:'R4',bytes:Buffer.from('XabcYZ').subarray(1,4)},
    inspectionArtifact:{inspectionRecordId:record.inspectionRecordId,designRevision:'R4',
      bytes:new Uint8Array([0,1,104,101,108,108,111,2]).subarray(2,7)},
  };
}

test('paired artifact bytes take simultaneous pre-await custody of both exact private subviews',async()=>{
  const input=fixture();
  const check=review(input);
  input.designArtifact.bytes[0]=0;
  input.inspectionArtifact.bytes[0]=0;
  const mismatch=review(input);
  input.designArtifact.bytes[0]=97;
  input.inspectionArtifact.bytes[0]=104;
  const result=await check;
  assert.equal(result.status,'JOB_TRUSS_PAIRED_ARTIFACT_BYTES_MATCH_ONLY');
  assert.equal(result.designArtifactBytesMatch,true);
  assert.equal(result.inspectionRecordBytesMatch,true);
  assert.equal(result.fabricationAuthorized,false);
  assert.equal(result.physicalInspectionVerified,false);
  assert.doesNotMatch(JSON.stringify(result),/Synthetic|ba7816bf|2cf24dba/);
  const rejected=await mismatch;
  assert.notEqual(rejected.status,result.status);
  assert.equal(rejected.designArtifactBytesMatch,false);
  assert.equal(rejected.inspectionRecordBytesMatch,false);
});

test('swapped bytes and one-sided matches hold without reporting partial success',async()=>{
  const swapped=fixture();
  [swapped.designArtifact.bytes,swapped.inspectionArtifact.bytes]=[swapped.inspectionArtifact.bytes,swapped.designArtifact.bytes];
  const wrongDesign=fixture(), wrongInspection=fixture();
  wrongDesign.designArtifact.bytes[0]=0;
  wrongInspection.inspectionArtifact.bytes[0]=0;
  for(const input of [swapped,wrongDesign,wrongInspection]){
    const result=await review(input);
    assert.notEqual(result.status,'JOB_TRUSS_PAIRED_ARTIFACT_BYTES_MATCH_ONLY');
    assert.equal(result.designArtifactBytesMatch,false);
    assert.equal(result.inspectionRecordBytesMatch,false);
    assert.equal(result.fabricationAuthorized,false);
  }
});
