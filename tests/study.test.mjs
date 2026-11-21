import test from 'node:test';
import assert from 'node:assert/strict';
import {runCommonTrussStudy} from '../dist/analysis/src/study.js';
const input={roof:{family:'common',spanFt:30,pitchRisePer12:6},areaIn2:5.25,elasticModulusPsi:1000000,roofPressurePsf:20,trussSpacingFt:2};
test('common truss study returns load-balanced preliminary demand report',()=>{
 const a=runCommonTrussStudy(input);
 assert.equal(a.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(a.appliedGravityLb,1200);
 assert.ok(Math.abs(a.reactionLeftLb.y+a.reactionRightLb.y-1200)<1e-5);
 assert.equal(a.memberDemands.length,13);
 assert.ok(a.maximumAbsoluteAxialLb>0);
 assert.ok(a.maximumDisplacementIn>0);
});
test('increased load scales preliminary axial demand linearly',()=>{
 const a=runCommonTrussStudy(input);
 const b=runCommonTrussStudy({...input,roofPressurePsf:40});
 assert.ok(Math.abs(b.maximumAbsoluteAxialLb/a.maximumAbsoluteAxialLb-2)<1e-8);
});
