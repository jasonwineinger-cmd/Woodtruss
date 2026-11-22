import assert from 'node:assert/strict';
import test from 'node:test';
import { compareScissorPairedReadings as compare } from '../dist/analysis/src/scissor-paired-observable-residual.js';

const core={
  modeledDownwardIn:[1e16,1,-1e16],observedDownwardIn:[0,0,0],
  modeledBearingLb:[-42,-58],observedBearingLb:[-41.75,-58.25],maxReactionDifferenceLb:.5,
};
test('preserves a signed residual after opposing gauges cancel and does not normalize uplift reactions',()=>{
  const r=compare(core);
  assert.deepEqual(r.gaugeResidualIn,[1e16,1,-1e16]);
  assert.equal(r.meanGaugeResidualIn,1/3);
  assert.deepEqual(r.bearingResidualLb,[-.25,.25]);
  assert.equal(r.totalReactionResidualLb,0);
});

test('individual matching bearings cannot hide an out-of-window total, nor can a matching total hide a wrong side',()=>{
  for(const model of [[-41,-57],[-40,-60]]){
    assert.throws(()=>compare({...core,modeledBearingLb:model, observedBearingLb:[-42,-58],
      maxReactionDifferenceLb:1.25}),/reaction|tolerance|bearing/i);
  }
  assert.throws(()=>compare({...core,modeledDownwardIn:[Number.MAX_VALUE,0,0],
    observedDownwardIn:[-Number.MAX_VALUE,0,0]}),/range|finite|residual/i);
});
