import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePreliminaryCommonTruss} from '../dist/analysis/src/common.js';
const near=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('common topology integrates with solver and equilibrates vertical load',()=>{
 const a=analyzePreliminaryCommonTruss({roof:{family:'common',spanFt:30,pitchRisePer12:6},areaIn2:5.25,elasticModulusPsi:1000000,ridgeLoadLb:-1000});
 near(a.result.reactionLb.L.y+a.result.reactionLb.E.y,1000);
 near(a.result.reactionLb.L.x+a.result.reactionLb.E.x,0);
 assert.ok(a.result.residualForceLb<1e-6);
 assert.equal(a.result.status,'PRELIMINARY_NOT_ENGINEERED');
});
test('reject nonfinite loads and unsupported truss family',()=>{
 const base={roof:{family:'common',spanFt:30,pitchRisePer12:6},areaIn2:5.25,elasticModulusPsi:1000000,ridgeLoadLb:-1000};
 assert.throws(()=>analyzePreliminaryCommonTruss({...base,ridgeLoadLb:Infinity}));
 assert.throws(()=>analyzePreliminaryCommonTruss({...base,roof:{...base.roof,family:'attic'}}));
});
