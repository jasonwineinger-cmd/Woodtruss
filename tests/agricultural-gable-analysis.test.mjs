import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePreliminaryAgriculturalGable } from '../dist/analysis/src/agricultural-gable-analysis.js';
import { generateAgriculturalGableTopology } from '../dist/geometry/src/agricultural-topology.js';

const input = {
  roof:{family:'agricultural',spanFt:40,pitchRisePer12:4},
  areaIn2:5.25,elasticModulusPsi:1_000_000,
  loadCase:{id:'point-benchmark',description:'Explicit signed gable joint forces',
    jointLoads:[{nodeId:'Q1',fyLb:-1600},{nodeId:'Q3',fyLb:400,fxLb:100}]},
};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);

test('tied agricultural gable solves signed asymmetric benchmark with analytic bearing reactions',()=>{
  const outcome=analyzePreliminaryAgriculturalGable(input);
  assert.equal(outcome.fabricationAuthorized,false);
  assert.equal(outcome.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(outcome.topology.family,'agricultural');
  assert.equal(outcome.topology.subtype,'tied-gable-fink');
  assert.equal(outcome.model.nodes.length,8);
  assert.equal(outcome.model.bars.length,13);
  assert.equal(Object.keys(outcome.result.axialForceLb).length,13);
  assert.ok(Object.values(outcome.result.axialForceLb).every(Number.isFinite));
  const {L,E}=outcome.result.reactionLb;
  // Moment about L: 480 R_E = 120(1600) - 360(400) + 40(100).
  near(E.y,52000/480);
  near(L.y,1200-52000/480);
  near(L.x,-100);
  near(E.x,0);
  assert.equal(outcome.equilibrium.global.passes,true);
  assert.equal(outcome.equilibrium.joints.passes,true);
});

test('gable subset rejects geometry or loads outside its stated scope',()=>{
  const roof=input.roof;
  const topology=generateAgriculturalGableTopology({...roof,spanFt:50});
  assert.equal(topology.joints.find(j=>j.id===topology.bearings.right).position.x,600);
  for(const invalid of [
    {spanFt:50.001},{spanFt:51},{spanFt:Infinity},{pitchRisePer12:0},{heelHeightIn:1},{overhangIn:1},
    {bottomPitchRisePer12:1},{family:'attic'},
  ]) {
    assert.throws(()=>analyzePreliminaryAgriculturalGable({...input,roof:{...roof,...invalid}}));
  }
  const analyzeLoad=(jointLoads)=>analyzePreliminaryAgriculturalGable({...input,loadCase:{...input.loadCase,jointLoads}});
  assert.throws(()=>analyzeLoad([{nodeId:'not-a-joint',fyLb:1}]),/explicit joint load/);
  assert.throws(()=>analyzeLoad([{nodeId:'Q1',fxLb:NaN}]),/explicit joint load/);
  assert.throws(()=>analyzePreliminaryAgriculturalGable({...input,areaIn2:0}),/positive finite/);
});
