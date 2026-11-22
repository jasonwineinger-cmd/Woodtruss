import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewMomentRotationWitness} from '../dist/connections/src/plate-moment-rotation-witness.js';
const scope={observationId:'synthetic',sourceSha256:'a'.repeat(64),revision:'r3',memberId:'m',jointId:'j',end:'finish',
 axisId:'local test axis',positiveRotation:'counterclockwise',momentUnit:'lb-in',rotationUnit:'rad',branch:'increasing-rotation'};
const read=(sequence,momentLbIn,rotationRad)=>({sequence,momentLbIn,rotationRad});
const witness=()=>({...scope,endpoints:[read(3,-8,-.125),read(7,24,.125)]});
test('reports signed endpoint changes and a hand secant only, with no verified stiffness',()=>{
 const result=reviewMomentRotationWitness(scope,witness());
 assert.equal(result.status,'EMPIRICAL_SECANT_REVIEW_ONLY');
 assert.deepEqual(result.observed,{rotationDeltaRad:.25,momentDeltaLbIn:32,observedSecantLbInPerRad:128});
 for(const gate of ['reversibleBehaviorProven','designStiffnessVerified','capacityVerified','engineeringApproved',
  'fabricationAuthorized','machineReleaseAuthorized'])assert.equal(result[gate],false);
});

test('preserves a negative observed secant and an actual zero measured moment change',()=>{
 const expected={...scope,branch:'decreasing-rotation'};
 const changing={...expected,endpoints:[read(1,-8,.125),read(2,8,-.125)]};
 assert.deepEqual(reviewMomentRotationWitness(expected,changing).observed,
  {rotationDeltaRad:-.25,momentDeltaLbIn:16,observedSecantLbInPerRad:-64});
 changing.endpoints[1].momentLbIn=-8;
 assert.deepEqual(reviewMomentRotationWitness(expected,changing).observed,
  {rotationDeltaRad:-.25,momentDeltaLbIn:0,observedSecantLbInPerRad:0});
});

test('refuses mixed end/units/sign conventions and invalid, unordered or zero-rotation endpoints',()=>{
 for(const [change,hold] of [
  [r=>r.end='start','WITNESS_SCOPE_UNVERIFIED'],[r=>r.revision='r2','WITNESS_SCOPE_UNVERIFIED'],
  [r=>r.rotationUnit='deg','WITNESS_SCOPE_UNVERIFIED'],[r=>r.positiveRotation='clockwise','WITNESS_SCOPE_UNVERIFIED'],
  [r=>r.sourceSha256='b'.repeat(64),'WITNESS_SCOPE_UNVERIFIED'],[r=>r.approvedStiffness=128,'WITNESS_SCOPE_UNVERIFIED'],
  [r=>r.endpoints.reverse(),'ENDPOINTS_UNVERIFIED'],[r=>r.endpoints[1].rotationRad=-.125,'ENDPOINTS_UNVERIFIED'],
  [r=>r.endpoints[1].rotationRad=-.5,'ENDPOINTS_UNVERIFIED'],[r=>r.endpoints[1].momentLbIn=Infinity,'ENDPOINTS_UNVERIFIED'],
  [r=>r.endpoints=[read(1,-Number.MAX_VALUE,0),read(2,Number.MAX_VALUE,1)],'NUMERIC_SECANT_UNVERIFIED'],
 ]){
  const value=witness();change(value);
  const result=reviewMomentRotationWitness(scope,value);
  assert.equal(result.hold,hold);
  assert.equal(result.observed,null);
 }
});
