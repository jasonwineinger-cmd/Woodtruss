import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverElasticFrameLocalEndActions as recover} from '../dist/analysis/src/elastic-frame-local-end-actions.js';

const specimen=(releaseLeftRotation=false,releaseRightRotation=false)=>({
  lengthIn:12,areaIn2:3,secondMomentIn4:12,elasticModulusPsi:1000,releaseLeftRotation,releaseRightRotation,
  localEquivalentLoad:[0,-12,-24,0,-12,24],localDisplacements:[0,0,releaseLeftRotation?null:0,0,0,releaseRightRotation?null:0],
});
const vec=(actual,expected)=>{
  assert.equal(actual.length,expected.length);
  actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-10,`${v} ≠ ${expected[i]}`));
};

test('fixed member uses the node-on-member action sign and preserves fully retained displacements',()=>{
  const input=specimen();
  const result=recover(input);
  assert.deepEqual(result.localEndActions,[0,12,24,0,12,-24]);
  assert.deepEqual(result.localDisplacements,input.localDisplacements);
  assert.deepEqual(result.releasedMomentResiduals,[]);
  assert.equal(result.manufacturingApproved,false);
});

test('fixed-pinned and pin-pin uniform load recover analytic end actions and internally solved section rotations',()=>{
  const one=recover(specimen(false,true));
  vec(one.localDisplacements,[0,0,0,0,0,0.006]);
  vec(one.localEndActions,[0,15,36,0,9,0]);
  assert.equal(one.releasedMomentResiduals[0].dofIndex,5);
  const both=recover(specimen(true,true));
  vec(both.localDisplacements,[0,0,-0.012,0,0,0.012]);
  vec(both.localEndActions,[0,12,0,0,12,0]);
  assert.deepEqual(both.releasedRotationIndices,[2,5]);
  for(const {dofIndex,momentLbIn} of both.releasedMomentResiduals) assert.equal(momentLbIn,both.localEndActions[dofIndex]);
});

test('released rotation uses retained translations: rigid body motion induces no actions while axial strain gives opposite actions',()=>{
  const input=specimen(true,true);
  input.localEquivalentLoad=Array(6).fill(0);
  input.localDisplacements=[0,2,null,0.2,3.2,null];
  const result=recover(input);
  vec(result.localDisplacements,[0,2,0.1,0.2,3.2,0.1]);
  vec(result.localEndActions,[-50,0,0,50,0,0]);
});

test('holds malformed displacements and unreleased loads, invalid flags, unknown fields and overflow',()=>{
  const input=specimen(false,true);
  for(const localDisplacements of [[0,0,0,0,0,0],[null,0,0,0,0,null],[0,,0,0,0,null],[0,0,NaN,0,0,null]])
    assert.throws(()=>recover({...input,localDisplacements}),/finite-or-null/);
  assert.throws(()=>recover({...input,localEquivalentLoad:[0,0,0,0,0,Infinity]}),/dense finite/);
  assert.throws(()=>recover({...input,releaseRightRotation:'true'}),/Explicit end/);
  assert.throws(()=>recover({...input,localDisplacements:[Number.MAX_VALUE,0,0,0,0,null]}),/usable numeric range/);
  assert.throws(()=>recover({...input,globalDisplacements:[]}),/Unknown or missing/);
});
