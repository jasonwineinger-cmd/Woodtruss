import test from 'node:test';
import assert from 'node:assert/strict';
import { elasticFrameMemberUniformLoad as reduce } from '../dist/analysis/src/elastic-frame-member-load.js';

const specimen = () => ({
  left: { xIn: -2, yIn: 7 }, right: { xIn: 4, yIn: 15 },
  releaseLeftRotation: false, releaseRightRotation: false, basis: 'member-length',
  qxLbPerIn: 6, qyLbPerIn: -10,
});
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-11, `${a} does not match ${b}`);
const vector = (a, b) => { assert.equal(a.length, b.length); a.forEach((x, i) => close(x,b[i])); };

test('matches independently calculated diagonal axial and bending equivalent loads', () => {
  const result = reduce(specimen());
  // L=10, local X=(.6,.8), local Y=(-.8,.6); global resultants are (60,-100).
  vector(result.localEquivalentLoad, [-22,-54,-90,-22,-54,90]);
  vector(result.globalEquivalentLoad, [30,-50,-90,30,-50,90]);
  assert.deepEqual(result.physicalResultant, { fxLb:60, fyLb:-100, midpoint:{xIn:1,yIn:11}, momentAboutLeftLbIn:-540 });
  const [fx1,fy1,m1,fx2,fy2,m2] = result.globalEquivalentLoad;
  vector([fx1+fx2,fy1+fy2,m1+m2+6*fy2-8*fx2], [60,-100,-540]);
  assert.equal(result.manufacturingApproved, false);
});

test('projection and end reversal preserve physical force and swap ordered DOF triplets', () => {
  const input = { ...specimen(), basis:'horizontal-projection' };
  const result = reduce(input);
  vector(result.globalEquivalentLoad, [18,-30,-54,18,-30,54]);
  assert.equal(result.loadedMeasureIn, 6);
  const reversed = reduce({ ...input, left: input.right, right: input.left });
  vector(reversed.globalEquivalentLoad, [18,-30,54,18,-30,-54]);
  assert.equal(reversed.physicalResultant.momentAboutLeftLbIn, 324);
  assert.deepEqual(reversed.physicalResultant.midpoint, result.physicalResultant.midpoint);
});

test('horizontal and vertical member axes have correct transverse-moment signs', () => {
  const input = { ...specimen(), left:{xIn:0,yIn:0}, qxLbPerIn:0, qyLbPerIn:-2 };
  assert.deepEqual(reduce({ ...input, right:{xIn:12,yIn:0} }).globalEquivalentLoad, [0,-12,-24,0,-12,24]);
  assert.deepEqual(reduce({ ...input, right:{xIn:0,yIn:12} }).globalEquivalentLoad, [0,-12,0,0,-12,0]);
});

test('rejects released or absent assumptions, a vertical zero projection, and nonfinite or collapsed geometry', () => {
  assert.throws(() => reduce({ ...specimen(), releaseLeftRotation:true }), /unreleased/);
  assert.throws(() => reduce({ ...specimen(), releaseRightRotation:undefined }), /unreleased/);
  assert.throws(() => reduce({ ...specimen(), basis:undefined }), /basis/);
  assert.throws(() => reduce({ ...specimen(), qxLbPerIn:Infinity }), /Finite ordered/);
  assert.throws(() => reduce({ ...specimen(), qxLbPerIn:Number.MAX_VALUE }), /usable numerical range/);
  assert.throws(() => reduce({ ...specimen(), right:specimen().left }), /nonzero member length/);
  assert.throws(() => reduce({ ...specimen(), basis:'horizontal-projection', right:{xIn:-2,yIn:20} }), /nonzero projection/);
});
