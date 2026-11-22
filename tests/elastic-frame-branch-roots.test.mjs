import test from 'node:test';
import assert from 'node:assert/strict';
import {isolateElasticFrameBranchRoots as solve} from '../dist/analysis/src/elastic-frame-branch-roots.js';

test('returns all three exact interior crossings independent of coefficient sign and magnitude',()=>{
  // (t-1/4)(t-1/2)(t-3/4) = t³ - 1.5t² + 11/16 t - 3/32.
  const polynomial=[-3/32,11/16,-1.5,1];
  for(const scale of [1,-1,2**900,-(2**-900)]) assert.deepEqual(solve(polynomial.map(c=>c*scale)),
    {roots:[0.25,0.5,0.75],flat:false});
});
test('includes exact double/triple touches and excludes exact segment endpoints',()=>{
  // (t-1/2)^2(t-3/4), then (t-1/2)^3, then t(t-1)(t-1/2).
  assert.deepEqual(solve([-3/16,1,-7/4,1]).roots,[0.5,0.75]);
  assert.deepEqual(solve([-1/8,3/4,-1.5,1]).roots,[0.5]);
  assert.deepEqual(solve([0,0.5,-1.5,1]).roots,[0.5]);
  assert.deepEqual(solve([0,1,-2,1]).roots,[]);
});
test('does not merge distinct near-boundary roots or invent a near-zero stationary root',()=>{
  const tiny=2**-45;
  // Roots exactly 0, tiny and 1-tiny; product is represented exactly here because
  // tiny*(1-tiny) spans only 45 significant binary positions.
  assert.deepEqual(solve([0,tiny*(1-tiny),-1,1]).roots,[tiny,1-tiny]);
  assert.deepEqual(solve([0.25+Number.EPSILON,-1,1]).roots,[]);
  assert.deepEqual(solve([-Number.MIN_VALUE,1]).roots,[Number.MIN_VALUE]);
  assert.equal(solve([-2/16,0,1]).roots[0],Math.sqrt(2/16));
});
test('separates a genuinely flat zero polynomial; rejects malformed or unrepresentable roots',()=>{
  assert.deepEqual(solve([0,0,-0,0]),{roots:[],flat:true});
  assert.deepEqual(solve([1,0]),{roots:[],flat:false});
  for(const input of [[],[Infinity],[1,,2],[1,2,3,4,5],['1']]) assert.throws(()=>solve(input),/finite dense/);
  assert.throws(()=>solve([-Number.MIN_VALUE,4]),/cannot be represented/);
});
