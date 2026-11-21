import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeScissorGravity} from '../dist/analysis/src/scissor-gravity.js';
test('scissor preliminary gravity model balances force and moment',()=>{
 const r=analyzeScissorGravity({roof:{family:'scissor',spanFt:40,pitchRisePer12:6,bottomPitchRisePer12:3},
  areaIn2:5.25,elasticModulusPsi:1000000,roofPressurePsf:20,trussSpacingFt:2});
 assert.equal(r.totalAppliedGravityLb,1600);
 assert.equal(r.equilibrium.passes,true);
 assert.ok(Math.abs(r.result.reactionLb.L.y+r.result.reactionLb.E.y-1600)<1e-5);
 assert.equal(r.status,'PRELIMINARY_NOT_ENGINEERED');
});
test('scissor analysis rejects invalid geometry and properties',()=>{
 const base={roof:{family:'scissor',spanFt:40,pitchRisePer12:6,bottomPitchRisePer12:3},
  areaIn2:5.25,elasticModulusPsi:1000000,roofPressurePsf:20,trussSpacingFt:2};
 assert.throws(()=>analyzeScissorGravity({...base,areaIn2:0}));
 assert.throws(()=>analyzeScissorGravity({...base,roof:{...base.roof,bottomPitchRisePer12:7}}));
});
