import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverElasticFrameDeflectionExtrema as recover } from '../dist/analysis/src/elastic-frame-deflection-extrema.js';

const basic = {
  lengthIn:12,elasticModulusPsi:1200,areaIn2:10,secondMomentIn4:12,
  shear:{shearModulusPsi:300,effectiveShearAreaIn2:4},uniform:null,
};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} ≠ ${b}`);

test('moving both ends and translating the section rotations preserves chord-relative deflection',()=>{
  // Simply supported, P=8 lb down at x=6. Shear-flexible cusp is −0.04 in.
  const input={...basic,point:{stationIn:6,fxLb:0,fyLb:-8},
    localEndActions:[0,4,0,0,4,0],localDisplacements:[0,0,-0.005,0,0,0.005]};
  const original=recover(input);
  const moved=recover({...input,localDisplacements:[0,1,0.015,0,1.24,0.025]});
  assert.equal(original.chordRelativeTransverseIn.min.stationIn,6);
  assert.equal(moved.chordRelativeTransverseIn.min.stationIn,6);
  near(original.chordRelativeTransverseIn.min.valueIn,-0.04);
  near(moved.chordRelativeTransverseIn.min.valueIn,-0.04);
  assert.equal(moved.transverseIn.min.stationIn,0);
  assert.equal(moved.transverseIn.max.stationIn,12);
  near(moved.transverseIn.min.valueIn,1);
  near(moved.transverseIn.max.valueIn,1.24);
  assert.equal(moved.serviceabilityApproved,false);
  assert.equal(moved.fabricationAuthorized,false);
});

test('an affine motion reports a zero chord departure without choosing an arbitrary interior station',()=>{
  const input={...basic,lengthIn:8,point:null,
    localEndActions:[0,0,0,0,0,0],localDisplacements:[0,1,0.125,0,2,0.125]};
  const result=recover(input);
  assert.deepEqual(result.transverseIn,{min:{stationIn:0,valueIn:1},max:{stationIn:8,valueIn:2}});
  assert.deepEqual(result.chordRelativeTransverseIn,{min:{stationIn:0,valueIn:0},max:{stationIn:0,valueIn:0}});
  assert.throws(()=>recover({...input,codeLimitIn:0.1}),/Unknown or missing/);
});
