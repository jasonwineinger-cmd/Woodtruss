import test from 'node:test';
import assert from 'node:assert/strict';
import { condenseElasticFrameMemberLoad as condense } from '../dist/analysis/src/elastic-frame-release-load.js';

const properties = (left, right) => ({
  lengthIn: 12, areaIn2: 3, secondMomentIn4: 12, elasticModulusPsi: 1000,
  releaseLeftRotation: left, releaseRightRotation: right,
});
const apply = (left,right,localEquivalentLoad) => condense({...properties(left,right),localEquivalentLoad});
const vector = (actual,expected) => {
  assert.equal(actual.length,expected.length);
  actual.forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<1e-10,`${value} ≠ ${expected[i]}`));
};

test('unreleased vector is returned as a fresh snapshot with preserved DOF order',()=>{
  const rhs = Object.freeze([1,-12,-24,2,-12,24]);
  const outcome = apply(false,false,rhs);
  assert.notEqual(outcome,rhs);
  assert.deepEqual(outcome,rhs);
});

test('uniform pin–pin load redistributes moments to zero without losing force; fixed–pinned uses 5/8 and 3/8',()=>{
  // Uniform -2 lb/in over 12 in. Axial loads are unrelated and unchanged.
  const rhs = Object.freeze([3,-12,-24,7,-12,24]);
  vector(apply(true,true,rhs),[3,-12,0,7,-12,0]);
  vector(apply(false,true,rhs),[3,-15,-36,7,-9,0]);
  vector(apply(true,false,rhs),[3,-9,0,7,-15,36]);
  assert.ok(Object.is(apply(false,true,rhs)[5],0));
});

test('off-center pin–pin point load follows independently calculated lever arms',()=>{
  // P=-20 lb at L/4. Exact fixed-end shape values create this unreleased RHS.
  const rhs = [0,-16.875,-33.75,0,-3.125,11.25];
  const out = apply(true,true,rhs);
  vector(out,[0,-15,0,0,-5,0]);
  assert.equal(out[2]+out[5]+12*out[4],-60);
});

test('fails closed on invalid properties, release flags, nonnumeric/sparse vectors, unknown fields or overflow',()=>{
  const rhs=[0,-12,-24,0,-12,24];
  const input={...properties(false,true),localEquivalentLoad:rhs};
  assert.throws(()=>condense({...input,releaseRightRotation:0}),/Explicit end rotation/);
  assert.throws(()=>condense({...input,lengthIn:0}),/Finite positive/);
  assert.throws(()=>condense({...input,irrelevant:true}),/Unknown or missing/);
  for(const bad of [[0,0,0,0,0],[0,0,0,,0,0],[0,0,0,0,0,Infinity],['0',0,0,0,0,0]])
    assert.throws(()=>condense({...input,localEquivalentLoad:bad}),/dense finite/);
  const huge=Number.MAX_VALUE;
  assert.throws(()=>condense({...input,localEquivalentLoad:[0,-huge,0,0,0,huge]}),/usable numeric range/);
});
