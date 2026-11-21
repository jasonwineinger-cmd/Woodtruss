import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePreliminaryMonoTruss } from '../dist/analysis/src/mono-analysis.js';

const base = {
  roof: {family:'mono',spanFt:30,pitchRisePer12:6},
  areaIn2: 5.25,
  elasticModulusPsi: 1_000_000,
  loadCase: {
    id:'illustrative-a',
    description:'Asymmetric point loads at different heights',
    jointLoads:[{nodeId:'T1',fyLb:-1000},{nodeId:'T3',fxLb:200,fyLb:-600}],
  },
};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);

test('stable mono analysis balances asymmetric force and first moments at named bearings',()=>{
  const result=analyzePreliminaryMonoTruss(base);
  assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(result.model.supports,[
    {nodeId:'L',fixX:true,fixY:true},{nodeId:'E',fixX:false,fixY:true},
  ]);
  assert.equal(result.model.bars.length,15);
  assert.equal(Object.keys(result.result.axialForceLb).length,15);
  assert.ok(Object.values(result.result.axialForceLb).every(Number.isFinite));
  assert.ok(result.result.displacementIn.T3.y<0);
  const {L,E}=result.result.reactionLb;
  // About L: right reaction × 360 balances vertical lever arms 90/270,
  // plus the positive x load applied at height 135.
  const expectedRight=(1000*90+600*270+200*135)/360;
  near(E.y,expectedRight);
  near(L.y,1600-expectedRight);
  near(L.x,-200);
  near(E.x,0);
  near(result.equilibrium.global.sumMomentAboutOriginLbIn,0);
  assert.equal(result.equilibrium.global.passes,true);
  assert.equal(result.equilibrium.joints.passes,true);
  assert.equal(result.equilibrium.joints.joints.length,9);
});

test('50-foot cap, unsupported geometry and invalid illustrative inputs fail closed',()=>{
  const altered=(roof)=>({...base,roof:{...base.roof,...roof}});
  assert.equal(analyzePreliminaryMonoTruss(altered({spanFt:50})).model.nodes.find(n=>n.id==='E').x,600);
  for(const spanFt of [50.001,51,Infinity]) assert.throws(()=>analyzePreliminaryMonoTruss(altered({spanFt})),/8 and 50/);
  assert.throws(()=>analyzePreliminaryMonoTruss(altered({heelHeightIn:1})),/Raised-heel/);
  assert.throws(()=>analyzePreliminaryMonoTruss(altered({overhangIn:1})),/overhang/);
  assert.throws(()=>analyzePreliminaryMonoTruss({...base,areaIn2:0}),/positive finite/);
  assert.throws(()=>analyzePreliminaryMonoTruss({...base,elasticModulusPsi:Infinity}),/positive finite/);
  for(const jointLoads of [[{nodeId:'UNKNOWN',fyLb:-1}],[{nodeId:'T1',fyLb:NaN}]]){
    assert.throws(()=>analyzePreliminaryMonoTruss({...base,loadCase:{...base.loadCase,jointLoads}}),/Invalid explicit joint load/);
  }
});
