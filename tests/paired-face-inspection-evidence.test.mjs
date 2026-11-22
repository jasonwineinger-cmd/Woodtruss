import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewPairedFaceInspectionEvidence } from '../dist/fabrication/src/paired-face-inspection-evidence.js';

const faces=['face-a','face-b'];
const expected=[{jointId:'joint-placement',method:'plate-placement'},{jointId:'joint-count',method:'tooth-count'}];
const fixture=()=>({
 expected:structuredClone(expected),
 preliminary:faces.map(face=>({face,recordId:`private-prelim-${face}`,outcome:'reported-ok'})),
 detailed:expected.flatMap(row=>faces.map(face=>({...row,face,recordId:`private-${row.jointId}-${face}`,
  outcome:'reported-ok',toothCount:row.method==='tooth-count'?'reported-ok':'not-applicable'}))),
});
const review=(modify)=>{
 const input=fixture();
 modify?.(input);
 return reviewPairedFaceInspectionEvidence(input.expected,input.preliminary,input.detailed);
};
function status(result,expectedStatus){
 assert.equal(result.status,expectedStatus);
 for(const key of ['physicalInspectionVerified','fabricationAuthorized','machineReleaseAuthorized'])
  assert.equal(result[key],false);
 assert.doesNotMatch(JSON.stringify(result),/private-prelim|private-joint/u);
}
const hold=mutate=>status(review(mutate),'HOLD_PAIRED_FACE_DOCUMENTATION');

test('requires both faces for each exact method and returns no physical or manufacturing authority',()=>{
 status(review(i=>{i.preliminary.reverse();i.detailed.reverse();}),'PAIRED_FACE_DOCUMENTATION_MATCH_ONLY');
});

test('holds missing or duplicate faces, foreign joints and mismatched methods',()=>{
 for(const mutate of [
  i=>{i.expected=[];},i=>{i.preliminary.pop();},i=>{i.preliminary[1].face='face-a';},
  i=>{i.detailed.pop();},i=>{i.detailed[1].face='face-a';},i=>{i.detailed[0].jointId='foreign';},
  i=>{i.detailed[0].method='tooth-count';},i=>{i.detailed[3].method='plate-placement';},
 ]) hold(mutate);
});

test('holds repeated record IDs regardless of phase, injected fields and all discrepancy outcomes',()=>{
 for(const mutate of [
  i=>{i.preliminary[1].recordId=i.preliminary[0].recordId;},
  i=>{i.detailed[3].recordId=i.detailed[0].recordId;},
  i=>{i.detailed[0].recordId=i.preliminary[1].recordId;},
  i=>{i.preliminary[1].verified=true;},i=>{i.detailed[2].capacityLb=123;},
  i=>{i.preliminary[0].outcome='reported-discrepancy';},i=>{i.detailed[0].outcome='reported-discrepancy';},
  i=>{i.detailed[0].toothCount='reported-ok';},i=>{i.detailed[2].toothCount='not-applicable';},
  i=>{i.detailed[3].toothCount='reported-discrepancy';},i=>{delete i.detailed[0].toothCount;},
 ]) hold(mutate);
});
