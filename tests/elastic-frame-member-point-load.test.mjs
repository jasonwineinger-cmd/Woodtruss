import test from 'node:test';
import assert from 'node:assert/strict';
import { elasticFrameMemberPointLoad as reduce } from '../dist/analysis/src/elastic-frame-member-point-load.js';

const fixture = () => ({
  left: { xIn: -2, yIn: 7 }, right: { xIn: 4, yIn: 15 },
  releaseLeftRotation: false, releaseRightRotation: false,
  stationIn: 2.5, fxLb: 10, fyLb: -20,
});
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-11, `${a} ≠ ${b}`);
const vec = (actual, expected) => {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => close(value, expected[index]));
};

test('independent skew quarter-span Hermite load preserves physical force and moment', () => {
  const result = reduce(fixture());
  // L=10; local (P,V)=(-10,-20). At t=1/4, transverse shape coefficients
  // are 27/32, 45/32 in, 5/32, -15/32 in.
  vec(result.localEquivalentLoad, [-7.5,-16.875,-28.125,-2.5,-3.125,9.375]);
  vec(result.globalEquivalentLoad, [9,-16.125,-28.125,1,-3.875,9.375]);
  assert.deepEqual(result.physicalResultant, {fxLb:10,fyLb:-20,at:{xIn:-0.5,yIn:9},momentAboutLeftLbIn:-50});
  const [fx1,fy1,m1,fx2,fy2,m2] = result.globalEquivalentLoad;
  vec([fx1+fx2,fy1+fy2,m1+m2+6*fy2-8*fx2], [10,-20,-50]);
  assert.equal(result.manufacturingApproved,false);
});

test('matches virtual work under independent linear axial and cubic transverse test functions', () => {
  const result = reduce(fixture());
  // u(x)=2+0.4x, v(x)=3+0.2x-0.01x²+0.005x³, both evaluated at x=2.5.
  // At x=0, u/v/v'=2,3,0.2; at x=10, u/v/v'=6,9,1.5.
  const virtualDofs = [2,3,0.2,6,9,1.5];
  const work = result.localEquivalentLoad.reduce((sum, force, i) => sum+force*virtualDofs[i],0);
  close(work, -10*3 -20*(3+0.2*2.5-0.01*2.5**2+0.005*2.5**3));
});

test('ordered reversal with complementary station swaps global triplets, preserving the same point', () => {
  const input=fixture(), direct=reduce(input);
  const inverted=reduce({...input,left:input.right,right:input.left,stationIn:7.5});
  vec(inverted.globalEquivalentLoad, [...direct.globalEquivalentLoad.slice(3),...direct.globalEquivalentLoad.slice(0,3)]);
  assert.deepEqual(inverted.physicalResultant.at,direct.physicalResultant.at);
  assert.equal(inverted.physicalResultant.momentAboutLeftLbIn,150);
});

test('holds releases, endpoints, eccentric/couple-shaped inputs and unusable numerics', () => {
  const input=fixture();
  for (const stationIn of [-1,0,10,11]) assert.throws(()=>reduce({...input,stationIn}),/Strict interior/);
  for (const stationIn of [Infinity,NaN,'2.5']) assert.throws(()=>reduce({...input,stationIn}),/Finite endpoints/);
  assert.throws(()=>reduce({...input,releaseRightRotation:true}),/unreleased/);
  assert.throws(()=>reduce({...input,releaseRightRotation:undefined}),/unreleased/);
  assert.throws(()=>reduce({...input,right:input.left}),/nonzero member length/);
  assert.throws(()=>reduce({...input,stationIn:Number.MIN_VALUE}),/usable numerical range/);
  assert.throws(()=>reduce({...input,momentLbIn:0}),/Unknown or missing/);
  assert.throws(()=>reduce({...input,offsetIn:0}),/Unknown or missing/);
  assert.throws(()=>reduce({...input,left:{...input.left,zIn:0}}),/Exact ordered/);
});
