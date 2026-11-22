import test from 'node:test';
import assert from 'node:assert/strict';
import {elasticFrameShearElementLocalStiffness as stiffness} from '../dist/analysis/src/elastic-frame-shear-element.js';
import {elasticFrameElementLocalStiffness as legacy} from '../dist/analysis/src/elastic-frame-element.js';
const base={lengthIn:12,areaIn2:3,secondMomentIn4:12,elasticModulusPsi:1000,shearModulusPsi:250,effectiveShearAreaIn2:2};
const close=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} ≠ ${expected}`);
const apply=(k,d)=>k.map(row=>row.reduce((acc,value,i)=>acc+value*d[i],0));

test('matches analytic phi=2 and exact symmetric signs; uniform rod and rigid motions are preserved',()=>{
  const result=stiffness(base); // EI=12000, GAs=500, L=12.
  assert.equal(result.shearFlexibility.phi,2);
  const k=result.matrix;
  close(k[0][0],250); close(k[1][1],250/9); close(k[1][2],500/3);
  close(k[2][2],2000); assert.equal(k[2][5],0);
  close(k[4][5],-500/3);
  k.forEach((row,i)=>row.forEach((value,j)=>assert.equal(value,k[j][i])));
  for(const rigid of [[1,0,0,1,0,0],[0,1,0,0,1,0],[0,0,1,0,12,1]])
    apply(k,rigid).forEach(value=>close(value,0));
  assert.equal(result.manufacturingApproved,false);
});

test('cantilever under end force adds PL/GAs to independent Euler bending displacement',()=>{
  const [,,,,rowV,rowTheta]=stiffness(base).matrix;
  const a=rowV[4],b=rowV[5],c=rowTheta[5];
  const P=10;
  const tipDeflection=P*c/(a*c-b*b);
  close(tipDeflection,P*12**3/(3*12000)+P*12/500);
});

test('very stiff shear approaches Euler–Bernoulli, while soft shear retains a nonzero spring and opposite rotation sign',()=>{
  const stiff=stiffness({...base,shearModulusPsi:1e300});
  const {lengthIn,areaIn2,secondMomentIn4,elasticModulusPsi}=base;
  const eb=legacy({lengthIn,areaIn2,secondMomentIn4,elasticModulusPsi,releaseLeftRotation:false,releaseRightRotation:false});
  stiff.matrix.forEach((row,i)=>row.forEach((value,j)=>close(value,eb.matrix[i][j])));
  const soft=stiffness({...base,shearModulusPsi:1e-300});
  assert.ok(soft.matrix[1][1]>0 && soft.matrix[1][1]<1e-299);
  assert.ok(soft.matrix[1][2]>0);
  close(soft.matrix[2][2],1000); close(soft.matrix[2][5],-1000);
  const evenSofter=stiffness({...base,shearModulusPsi:1e-309});
  assert.equal(evenSofter.shearFlexibility.phi,null);
  assert.ok(evenSofter.matrix[1][1]>0);
});

test('fails closed on missing or invalid shear inputs, release flags and unusable values',()=>{
  for(const value of [0,-1,Infinity,NaN,'10',undefined])
    assert.throws(()=>stiffness({...base,shearModulusPsi:value}),/six finite positive/);
  assert.throws(()=>stiffness({...base,effectiveShearAreaIn2:0}),/six finite positive/);
  assert.throws(()=>stiffness({...base,releaseLeftRotation:false}),/Exactly six/);
  assert.throws(()=>stiffness({...base,areaIn2:Number.MAX_VALUE}),/usable numeric range/);
});
