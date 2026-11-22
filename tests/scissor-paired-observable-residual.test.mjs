import assert from 'node:assert/strict';
import test from 'node:test';
import { compareScissorPairedReadings } from '../dist/analysis/src/scissor-paired-observable-residual.js';

const base={modeledDownwardIn:[1e16,1,-1e16],observedDownwardIn:[0,0,0],
 modeledBearingLb:[120,90],observedBearingLb:[118,94],maxReactionDifferenceLb:4};
const compare=(change)=>compareScissorPairedReadings({...base,...change});

test('retains signed ordered residuals, a small remaining gauge term and exact tolerance equality',()=>{
 assert.deepEqual(compare(),{gaugeResidualIn:[1e16,1,-1e16],meanGaugeResidualIn:1/3,
  bearingResidualLb:[2,-4],totalReactionResidualLb:-2});
});

test('rejects individually bad bearings even when they cancel and total-only mismatches independently',()=>{
 assert.throws(()=>compare({observedBearingLb:[115,95]}),/bearing or in total/u);
 assert.throws(()=>compare({observedBearingLb:[117,87]}),/bearing or in total/u);
 assert.doesNotThrow(()=>compare({observedBearingLb:[120,90],maxReactionDifferenceLb:0}));
});

test('rejects malformed or nonfinite pairs instead of exposing any partial residual',()=>{
 for(const change of [
  {allowableDeflectionIn:1},{modeledDownwardIn:[1,2]},{observedBearingLb:[1,2,3]},
  {observedDownwardIn:[1,NaN,2]},{maxReactionDifferenceLb:-0.001},
  {modeledDownwardIn:[Number.MAX_VALUE,1,2],observedDownwardIn:[-Number.MAX_VALUE,0,0]},
 ]) assert.throws(()=>compare(change),/paired scissor|plain data|exact|nonnegative/iu);
});
