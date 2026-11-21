import assert from 'node:assert/strict';
import test from 'node:test';
import {analyzePreliminaryAsymmetricCommonTruss as analyze} from '../dist/analysis/src/asymmetric-common-analysis.js';

const input={
  roof:{spanFt:30,leftPitchRisePer12:4,rightPitchRisePer12:8},
  areaIn2:5.25,elasticModulusPsi:1_000_000,
  loadCase:{id:'illustration',description:'Signed point loads at two specified joints',
    jointLoads:[{nodeId:'Q1',fyLb:-900},{nodeId:'Q3',fyLb:200,fxLb:120}]},
};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('actual asymmetric graph solves and agrees with independent signed force and moment equations',()=>{
  const a=analyze(input);
  assert.deepEqual(a.referenceRidgeIn,{x:240,y:80});
  assert.deepEqual(a.model.supports,[
    {nodeId:'L',fixX:true,fixY:true},{nodeId:'E',fixX:false,fixY:true},
  ]);
  assert.equal(a.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(a.fabricationAuthorized,false);
  assert.equal(a.model.nodes.length,8);
  assert.equal(a.model.bars.length,13);
  assert.ok(Object.values(a.result.axialForceLb).every(Number.isFinite));
  assert.ok(a.equilibrium.global.passes && a.equilibrium.joints.passes);
  // Hand statics: R_E * 360 = (900 * 120) - (200 * 300) + (120 * 40).
  const {L,E}=a.result.reactionLb;
  near(E.y,52800/360);
  near(L.y,700-52800/360);
  near(L.x,-120);
  near(E.x,0);
});

test('mirrored slopes change the moments without moving the level bearings',()=>{
  const a=analyze({...input,roof:{spanFt:30,leftPitchRisePer12:8,rightPitchRisePer12:4}});
  assert.deepEqual(a.referenceRidgeIn,{x:120,y:80});
  // Unchanged named loads act at x=60 and x=240. At Q3, y=40 stays the same.
  near(a.result.reactionLb.E.y,(900*60-200*240+120*40)/360);
  assert.ok(a.equilibrium.global.passes && a.equilibrium.joints.passes);
});

test('fails closed on unsupported geometry, over-span and invalid input',()=>{
  const solve=(edits)=>analyze({...input,roof:{...input.roof,...edits}});
  assert.equal(solve({spanFt:50}).model.nodes.find(j=>j.id==='E').x,600);
  for(const bad of [{spanFt:50.001},{spanFt:51},{heelHeightIn:1},{overhangIn:1},{rightPitchRisePer12:0}])
    assert.throws(()=>solve(bad));
  for(const invalid of [{nodeId:'UNKNOWN',fyLb:2},{nodeId:'Q1',fxLb:Infinity}])
    assert.throws(()=>analyze({...input,loadCase:{...input.loadCase,jointLoads:[invalid]}}),/explicit joint load/);
  assert.throws(()=>analyze({...input,elasticModulusPsi:0}),/positive finite/);
});
