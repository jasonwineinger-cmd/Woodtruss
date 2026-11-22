import test from 'node:test';
import assert from 'node:assert/strict';
import {elasticFrameShearReleasedLocalStiffness as stiffness, condenseElasticFrameShearLoad as rhs}
  from '../dist/analysis/src/elastic-frame-shear-release.js';
import {elasticFrameShearElementLocalStiffness as full} from '../dist/analysis/src/elastic-frame-shear-element.js';
const section={lengthIn:12,areaIn2:3,secondMomentIn4:12,elasticModulusPsi:1000,shearModulusPsi:250,effectiveShearAreaIn2:2};
const props=(releaseLeftRotation=false,releaseRightRotation=false)=>({...section,releaseLeftRotation,releaseRightRotation});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} ≠ ${b}`);
const vec=(a,b)=>{assert.equal(a.length,b.length); a.forEach((value,i)=>close(value,b[i]));};

test('phi=2 rigid and one-released coefficients match the full element and independent one-pivot formula',()=>{
  const rigid=stiffness(props());
  assert.deepEqual(rigid.matrix, full(section).matrix);
  const one=stiffness(props(false,true));
  assert.deepEqual(one.releasedRotationIndices,[5]);
  assert.equal(one.shearFlexibility.phi,2);
  const m=one.matrix;
  // The unreleased column 5 has coupling ±500/3, zero opposite theta, pivot 2000.
  close(m[1][1],250/9-(500/3)**2/2000);
  close(m[1][2],500/3); close(m[2][2],2000);
  assert.deepEqual(m[5],Array(6).fill(0));
  assert.ok(m.every(row=>row[5]===0));
  m.forEach((row,i)=>row.forEach((value,j)=>assert.equal(value,m[j][i])));
});

test('two released rotations preserve exact axial-only stiffness and pin–pin load statics',()=>{
  const m=stiffness(props(true,true)).matrix;
  assert.deepEqual(m,[
    [250,0,0,-250,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],
    [-250,0,0,250,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],
  ]);
  const localEquivalentLoad=[6,-15.625,-26.25,2,-4.375,18.75]; // Quarter span signed force from the phi=2 shape functions.
  const f=rhs({...props(true,true),localEquivalentLoad});
  vec(f,[6,-15,0,2,-5,0]);
  close(f[1]+f[4],-20); close(12*f[4],-60);
});

test('uniform member loading keeps the independent force/moment resultant under either one-end release',()=>{
  const localEquivalentLoad=Object.freeze([0,-12,-24,0,-12,24]);
  const right=rhs({...props(false,true),localEquivalentLoad});
  const left=rhs({...props(true,false),localEquivalentLoad});
  vec(right,[0,-14,-24,0,-10,0]);
  vec(left,[0,-10,0,0,-14,24]);
  for(const f of [left,right]) { close(f[1]+f[4],-24); close(f[2]+f[5]+12*f[4],-144); }
  assert.deepEqual(rhs({...props(),localEquivalentLoad}),localEquivalentLoad);
  assert.notEqual(rhs({...props(),localEquivalentLoad}),localEquivalentLoad);
});

test('fails closed on invalid fields, flags, malformed load vectors and overflowing RHS elimination',()=>{
  assert.throws(()=>stiffness({...props(),releaseLeftRotation:undefined}),/Explicit end/);
  assert.throws(()=>stiffness({...props(),effectiveShearAreaIn2:0}),/finite positive/);
  assert.throws(()=>stiffness({...props(),model:'different'}),/Unknown or missing/);
  for(const localEquivalentLoad of [[0,0,0,0,0],[0,0,,0,0,0],[0,0,0,0,0,Infinity]])
    assert.throws(()=>rhs({...props(false,true),localEquivalentLoad}),/dense finite/);
  const huge=Number.MAX_VALUE;
  assert.throws(()=>rhs({...props(false,true),localEquivalentLoad:[0,-huge,0,0,0,huge]}),/usable numeric range/);
});
