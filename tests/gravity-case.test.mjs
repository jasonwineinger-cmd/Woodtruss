import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeCommonGravityCase} from '../dist/analysis/src/gravity-case.js';
const near=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('distributed gravity case conserves load and reactions for 40ft truss',()=>{
 const a=analyzeCommonGravityCase({roof:{family:'common',spanFt:40,pitchRisePer12:4},areaIn2:5.25,elasticModulusPsi:1000000,roofPressurePsf:30,trussSpacingFt:2});
 near(a.totalAppliedGravityLb,2400);
 assert.equal(a.equilibrium.passes,true);
 near(a.equilibrium.sumMomentAboutOriginLbIn,0,1e-3);
 near(a.result.reactionLb.L.y+a.result.reactionLb.E.y,2400);
 near(a.result.reactionLb.L.y,1200);
 near(a.result.reactionLb.E.y,1200);
 near(a.result.reactionLb.L.x+a.result.reactionLb.E.x,0);
 assert.ok(a.result.residualForceLb<1e-5);
 assert.equal(a.result.status,'PRELIMINARY_NOT_ENGINEERED');
});
test('50ft upper span and invalid input',()=>{
 const input={roof:{family:'common',spanFt:50,pitchRisePer12:6},areaIn2:5.25,elasticModulusPsi:1000000,roofPressurePsf:20,trussSpacingFt:2};
 const a=analyzeCommonGravityCase(input);
 near(a.totalAppliedGravityLb,2000);
 assert.throws(()=>analyzeCommonGravityCase({...input,areaIn2:0}));
 assert.throws(()=>analyzeCommonGravityCase({...input,roof:{...input.roof,family:'attic'}}));
});
