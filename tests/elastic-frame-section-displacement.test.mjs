import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverElasticFrameSectionDisplacement as recover} from '../dist/analysis/src/elastic-frame-section-displacement.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} ≠ ${b}`);
const cantilever=()=>({
  lengthIn:12,elasticModulusPsi:1000,areaIn2:3,secondMomentIn4:12,
  shear:{shearModulusPsi:250,effectiveShearAreaIn2:2},uniform:{qxLbPerIn:0,qyLbPerIn:-2},point:null,
  localEndActions:[0,24,144,0,0,0],localDisplacements:[0,0,0,0,-0.72,-0.048],stationsIn:[12,6,0],
});

test('downward cantilever integrates the correct shear sign and independent bending/rotation formulas',()=>{
  const input=cantilever(), out=recover(input);
  assert.deepEqual(out.samples.map(row=>row.stationIn),[12,6,0]);
  for (const sample of out.samples) {
    const x=sample.stationIn;
    const bending=-2*x*x*(6*12**2-4*12*x+x*x)/(24*12000);
    const shear=-2*(12*x-x*x/2)/500;
    close(sample.transverseIn,bending+shear);
    close(sample.rotationRad,-2*(12**3-(12-x)**3)/(6*12000));
    close(sample.axialIn,0);
  }
  assert.equal(out.manufacturingApproved,false);
  assert.equal(out.samplesOnly,true);
  const withoutShear=recover({...input,shear:null,localDisplacements:[0,0,0,0,-0.432,-0.048]});
  close(withoutShear.samples[0].transverseIn,-0.432);
  assert.equal(withoutShear.shearDeformationModeled,false);
});

test('a concentric interior axial point has continuous displacement and a piecewise strain',()=>{
  const input={
    ...cantilever(),shear:null,uniform:null,point:{stationIn:3,fxLb:30,fyLb:0},
    localEndActions:[-30,0,0,0,0,0],localDisplacements:[0,0,0,0.03,0,0],stationsIn:[1.5,3,10],
  };
  const out=recover(input);
  const u=out.samples.map(row=>row.axialIn);
  u.forEach((value,i)=>close(value,[0.015,0.03,0.03][i]));
});

test('requires true end translation and rotation closure, not merely statically balanced forces',()=>{
  const input=cantilever();
  for (const i of [3,4,5]) {
    const incorrect=[...input.localDisplacements]; incorrect[i]+=0.01;
    assert.throws(()=>recover({...input,localDisplacements:incorrect}),/does not close.*DOFs/);
  }
  assert.throws(()=>recover({...input,localEndActions:[0,24,145,0,0,0]}),/does not close.*actions/);
});

test('holds absent or duplicate/foreign stations, null released end theta, unknown shape and unusable properties',()=>{
  const input=cantilever();
  for (const stationsIn of [[],[0,0],[0,,1],[NaN],[-1],[12.1],['1']]) {
    assert.throws(()=>recover({...input,stationsIn}),/explicit unique stations/);
  }
  assert.throws(()=>recover({...input,localDisplacements:[0,0,null,0,-0.72,-0.048]}),/six finite/);
  assert.throws(()=>recover({...input,shear:{shearModulusPsi:250,effectiveShearAreaIn2:2,assumed:true}}),/explicit positive shear/i);
  assert.throws(()=>recover({...input,areaIn2:Number.MAX_VALUE}),/usable numeric range/);
});
