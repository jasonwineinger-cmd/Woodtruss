import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewLoadSlipObservation} from '../dist/connections/src/plate-load-slip-observation.js';
const scope={observationId:'synthetic',revision:'r2',jointId:'example',axisId:'X',forceUnit:'lb',slipUnit:'in'};
const sample=(forceLb,slipIn)=>({forceLb,slipIn});
const fixture=()=>({...scope,increasing:[sample(0,0),sample(4,.25),sample(8,.5)],
 decreasing:[sample(8,.5),sample(4,.375),sample(0,.125)]});

test('compares exact observed stations and preserves observed return offset rather than proving reversibility',()=>{
 const result=reviewLoadSlipObservation(scope,fixture());
 assert.equal(result.status,'OBSERVED_LOAD_SLIP_REVIEW_ONLY');
 assert.deepEqual(result.rows.map(r=>[r.forceLb,r.observedReturnDeltaIn,r.increasingResidualFromChordIn,r.decreasingResidualFromChordIn]),
  [[0,.125,0,.125],[4,.125,0,.125],[8,0,0,0]]);
 assert.equal(result.returnSlipDeltaIn,.125);
 for(const gate of ['reversibleBehaviorProven','stiffnessVerified','capacityVerified','engineeringApproved',
  'fabricationAuthorized','machineReleaseAuthorized'])assert.equal(result[gate],false);
});

test('retains a nonlinear observation instead of smoothing it into the explicit chord',()=>{
 const reported=fixture();
 reported.increasing[1].slipIn=.125;
 const result=reviewLoadSlipObservation(scope,reported);
 assert.equal(result.rows[1].increasingResidualFromChordIn,-.125);
 assert.equal(result.rows[1].observedReturnDeltaIn,.25);
});

test('holds a different scope, incomplete or reversed force path, unmatched stations and disconnected turn',()=>{
 for(const [change,hold] of [
  [s=>s.revision='r1','SCOPE_UNVERIFIED'],[s=>s.axisId='Y','SCOPE_UNVERIFIED'],[s=>s.slipUnit='mm','SCOPE_UNVERIFIED'],
  [s=>s.increasing.reverse(),'OBSERVATIONS_UNVERIFIED'],[s=>s.decreasing.pop(),'OBSERVATIONS_UNVERIFIED'],
  [s=>s.decreasing[1].forceLb=4.1,'OBSERVATIONS_UNVERIFIED'],[s=>s.decreasing[0].slipIn=.625,'OBSERVATIONS_UNVERIFIED'],
  [s=>s.increasing[0].slipIn=NaN,'OBSERVATIONS_UNVERIFIED'],
 ]){
  const input=fixture();change(input);
  const result=reviewLoadSlipObservation(scope,input);
  assert.equal(result.hold,hold);
  assert.deepEqual(result.rows,[]);
 }
});
