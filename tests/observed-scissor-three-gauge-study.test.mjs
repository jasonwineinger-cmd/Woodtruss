import assert from 'node:assert/strict';
import test from 'node:test';
import {studyObservedScissorThreeGaugeStiffness as study} from '../dist/analysis/src/observed-scissor-three-gauge-study.js';

// Synthetic comparison in the approximate stiffness range of a published
// report; none of these are historical USDA measurements or design inputs.
function sample(stepId,mean,total) {
  return {stepId,downwardGaugeIn:[mean-1/64,mean+1/64,mean],
    verticalBearingReactionLb:[total/4,3*total/4]};
}
const fixture={
  specimenId:'synthetic-specimen',testId:'synthetic-loading',
  sourceRef:'Independent synthetic example, not USDA raw data',
  gaugeIds:['left-quarter','right-quarter','middle'],
  bearingIds:['left-bearing','right-bearing'],
  samples:[{stepId:'early',downwardGaugeIn:[-1/32,3/32,1/8],verticalBearingReactionLb:[-10,240]},
    sample('r1',1/8,675),sample('r2',1/4,1280),
    sample('r3',3/8,1905),sample('r4',1/2,2550),sample('late',3/4,2600),
    {...sample('return',1/32,80),downwardGaugeIn:[0,1/32,1/16]}],
  fitWindow:{firstStepId:'r1',lastStepId:'r4'},
};
function near(actual,expected,tolerance=1e-9) {
  assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance,
    `${actual} does not match hand calculation ${expected}`);
}

test('three distinct gauges and two bearing reactions give an intercept-bearing OLS on the authored window only',()=>{
  const result=study(structuredClone(fixture));
  assert.equal(result.status,'PRELIMINARY_OBSERVED_COMPARISON_ONLY');
  assert.equal(result.fabricationAuthorized,false);
  assert.equal(result.sourceRef,fixture.sourceRef);
  assert.deepEqual(result.gaugeIds,fixture.gaugeIds);
  assert.deepEqual(result.bearingIds,fixture.bearingIds);
  assert.deepEqual({...result.fitWindow},fixture.fitWindow);
  assert.deepEqual(result.observations.map(r=>r.stepId),['r1','r2','r3','r4']);
  result.observations.forEach((row,i)=>{
    near(row.averageDownwardIn,[1/8,1/4,3/8,1/2][i]);
    near(row.totalBearingReactionLb,[675,1280,1905,2550][i]);
  });
  // Residuals [10,-10,-10,10] sum to zero and are orthogonal to
  // centered x=[-3,-1,1,3]/16. Thus the OLS line is 40+5000x.
  // Sxx=5/64, SSR=5000²·5/64, SSE=400.
  near(result.fit.slopeLbPerIn,5000);
  near(result.fit.interceptLb,40);
  near(result.fit.rSquared,1953125/1953525,1e-12);
  assert.equal(result.fit.sampleCount,4);
  const widened=study({...structuredClone(fixture),fitWindow:{firstStepId:'r1',lastStepId:'late'}});
  assert.ok(Math.abs(widened.fit.slopeLbPerIn-5000)>500);
  assert.equal(widened.fit.sampleCount,5);
  const includeEarly=study({...structuredClone(fixture),fitWindow:{firstStepId:'early',lastStepId:'r4'}});
  near(includeEarly.observations[0].averageDownwardIn,1/16);
  near(includeEarly.observations[0].totalBearingReactionLb,230);
});

test('malformed gauges/reactions and an unloading return in the fit are withheld',()=>{
  const mutate=(edit)=>{
    const input=structuredClone(fixture);
    edit(input);
    assert.throws(()=>study(input));
  };
  for (const edit of [
    x=>{x.fitWindow.lastStepId='return';},
    x=>{x.fitWindow={firstStepId:'r3',lastStepId:'r1'};},
    x=>{x.fitWindow={firstStepId:'r1',lastStepId:'r2'};},
    x=>{[x.samples[2],x.samples[3]]=[x.samples[3],x.samples[2]];},
    x=>{x.samples[6].downwardGaugeIn[0]=-Infinity;},
    x=>{x.samples[2].downwardGaugeIn[1]=NaN;},
    x=>{x.samples[2].downwardGaugeIn.pop();},
    x=>{x.samples[2].verticalBearingReactionLb.pop();},
    x=>{x.samples[2].verticalBearingReactionLb[1]=Infinity;},
    x=>{x.gaugeIds[1]=x.gaugeIds[0];},
    x=>{x.samples[0].reportedDeflectionIn=.031;},
    x=>{x.designApproved=true;},
  ]) mutate(edit);
});
