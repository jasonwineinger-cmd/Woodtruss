import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePreliminaryCommonTruss} from '../dist/analysis/src/common.js';
import {summarizeMemberDemands} from '../dist/lumber/src/index.js';
test('preliminary member demand report has finite stresses',()=>{
 const a=analyzePreliminaryCommonTruss({roof:{family:'common',spanFt:30,pitchRisePer12:6},areaIn2:5.25,elasticModulusPsi:1000000,ridgeLoadLb:-1000});
 const members=summarizeMemberDemands(a.model,a.result);
 assert.equal(members.length,13);
 assert.ok(members.every(m=>Number.isFinite(m.axialStressPsi)&&m.lengthIn>0));
 assert.ok(members.every(m=>m.eulerBucklingLb===null));
});
