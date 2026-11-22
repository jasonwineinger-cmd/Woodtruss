import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewMemberEndRelease} from '../dist/connections/src/plate-member-end-release.js';

const fixture=()=>({revision:'model-r3',memberId:'synthetic-member',sourceSha256:'b'.repeat(64),
 axis:'in-plane-rotation',ends:[
  {end:'start',jointId:'A',sourceLocator:'synthetic mark 1',declaration:'moment-released-idealization'},
  {end:'finish',jointId:'B',sourceLocator:'synthetic mark 2',declaration:'rotation-restrained-idealization'},
 ]});
test('preserves different start and finish idealizations without inferring physical stiffness',()=>{
 const expected=fixture(),supplied=fixture();
 supplied.ends.reverse();
 const result=reviewMemberEndRelease(expected,supplied);
 assert.equal(result.status,'DECLARED_RELEASE_MODEL_REVIEW_ONLY');
 assert.deepEqual(result.rows,[
  {end:'start',declaration:'moment-released-idealization'},
  {end:'finish',declaration:'rotation-restrained-idealization'},
 ]);
 for(const gate of ['numericalStiffnessInferred','physicalRestraintVerified','capacityVerified',
  'engineeringApproved','fabricationAuthorized','machineReleaseAuthorized'])assert.equal(result[gate],false);
 assert.equal(JSON.stringify(result).includes('synthetic mark'),false);
});
test('does not default a missing declaration or accept swapped ends, stale source, or design stiffness',()=>{
 const expected=fixture();
 for(const [alter,hold] of [
  [s=>s.ends.reverse().forEach((row,i)=>row.end=i?'finish':'start'),'END_DECLARATION_MISMATCH'],
  [s=>s.ends[0].declaration=s.ends[1].declaration,'END_DECLARATION_MISMATCH'],
  [s=>s.ends[0].sourceLocator='different citation','END_DECLARATION_MISMATCH'],
  [s=>s.ends[0].stiffnessLbInPerRad=500,'END_EVIDENCE_UNVERIFIED'],
  [s=>s.ends[0].jointId=s.ends[1].jointId,'END_EVIDENCE_UNVERIFIED'],
  [s=>s.ends[0].end=s.ends[1].end,'END_EVIDENCE_UNVERIFIED'],
  [s=>s.sourceSha256='a'.repeat(64),'SOURCE_OR_MEMBER_MISMATCH'],
  [s=>s.revision='model-r2','SOURCE_OR_MEMBER_MISMATCH'],
 ]){
  const supplied=fixture();alter(supplied);
  const result=reviewMemberEndRelease(expected,supplied);
  assert.equal(result.hold,hold);
  assert.deepEqual(result.rows,[]);
 }
 expected.ends[0].declaration='not-declared';
 const pending=reviewMemberEndRelease(expected,structuredClone(expected));
 assert.equal(pending.hold,'END_RELEASE_UNRESOLVED');
 assert.deepEqual(pending.rows[0],{end:'start',declaration:'not-declared'});
});
