import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeCommonGravityCase} from '../dist/analysis/src/gravity-case.js';
import {analyzeScissorGravity} from '../dist/analysis/src/scissor-gravity.js';

/** Broad numerical smoke tests; not independent structural design validation. */
const spans=[8,12,20,30,40,50];
const pitches=[2,4,6,8,12];
for(const spanFt of spans)for(const pitchRisePer12 of pitches){
 test(`common gravity sweep ${spanFt}ft ${pitchRisePer12}:12`,()=>{
  const a=analyzeCommonGravityCase({roof:{family:'common',spanFt,pitchRisePer12},
   areaIn2:5.25,elasticModulusPsi:1e6,roofPressurePsf:20,trussSpacingFt:2});
  const expected=spanFt*20*2;
  assert.ok(Math.abs(a.totalAppliedGravityLb-expected)<1e-8);
  assert.ok(Math.abs(a.result.reactionLb.L.y-expected/2)<1e-5);
  assert.ok(Math.abs(a.result.reactionLb.E.y-expected/2)<1e-5);
  assert.ok(a.equilibrium.passes);
  assert.ok(Object.values(a.result.axialForceLb).every(Number.isFinite));
  assert.ok(Object.values(a.result.displacementIn).every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)));
 });
}
for(const spanFt of [12,30,50])for(const pitchRisePer12 of [4,6,10]){
 test(`scissor gravity sweep ${spanFt}ft ${pitchRisePer12}:12`,()=>{
  const a=analyzeScissorGravity({roof:{family:'scissor',spanFt,pitchRisePer12,
   bottomPitchRisePer12:pitchRisePer12/2},areaIn2:5.25,elasticModulusPsi:1e6,
   roofPressurePsf:20,trussSpacingFt:2});
  assert.ok(a.equilibrium.passes);
  assert.ok(Math.abs(a.totalAppliedGravityLb-spanFt*40)<1e-8);
  assert.ok(Object.values(a.result.axialForceLb).every(Number.isFinite));
 });
}
