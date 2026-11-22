import test from 'node:test';
import assert from 'node:assert/strict';
import { fitObservedScissorStiffness as fit } from '../dist/analysis/src/observed-scissor-stiffness-fit.js';

const row=(x,y)=>({averageDownwardIn:x,totalBearingReactionLb:y});
const near=(a,b,tol)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<tol,`${a} vs ${b}`);

test('three-gauge regression preserves slope under representable offsets instead of multiplying uncentered squares',()=>{
  const slope=5000, x0=2**35, y0=2**43;
  const baseline=[0,0.125,0.375,0.75,1].map(x=>row(x,47+slope*x));
  const displaced=baseline.map(({averageDownwardIn:x,totalBearingReactionLb:y})=>row(x+x0,y+y0));
  const first=fit(baseline), second=fit(displaced);
  near(first.slopeLbPerIn,slope,1e-9);
  near(first.interceptLb,47,1e-8);
  near(second.slopeLbPerIn,slope,1e-9);
  near(second.interceptLb,47+y0-slope*x0,1);
  near(second.rSquared,1,1e-12);
  assert.equal(second.sampleCount,5);
});

test('nonpositive slope, zero movement, and repeated sampling levels hold rather than infer a stiffness',()=>{
  for(const rows of [
    [row(0,100),row(0,300),row(0,400)],
    [row(3,100),row(2,300),row(1,400)],
    [row(0,100),row(1,300),row(2,300)],
    [row(0,100),row(1,300),row(2,200)],
  ])assert.throws(()=>fit(rows),/fit|slope|increas|variation|stiffness|regress/i);
});
