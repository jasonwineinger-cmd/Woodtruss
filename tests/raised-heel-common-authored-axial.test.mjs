import assert from 'node:assert/strict';
import test from 'node:test';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';
import { analyzePreliminaryRaisedHeelCommonTruss } from '../dist/analysis/src/raised-heel-common-analysis.js';
import { buildRaisedHeelCommonAuthoredElasticFrameModel as build } from '../dist/analysis/src/raised-heel-common-authored-elastic-frame-model.js';

const roof = {family:'common',spanFt:20,pitchRisePer12:6,heelHeightIn:30};
const supports = [
  {nodeId:'L',fixX:true,fixY:true,fixRotation:false},
  {nodeId:'E',fixX:false,fixY:true,fixRotation:false},
];
const areaIn2=8, elasticModulusPsi=1.2e6;
const incidence = [
  ['top','HL','Q1'], ['top','Q1','R'], ['top','R','Q3'], ['top','Q3','HE'],
  ['bottom','L','B1'], ['bottom','B1','B2'], ['bottom','B2','B3'], ['bottom','B3','E'],
  ['web','Q1','B1'], ['web','Q1','B2'], ['web','R','B2'], ['web','Q3','B2'], ['web','Q3','B3'],
  ['web','L','HL'], ['web','HL','B1'], ['web','B3','HE'], ['web','HE','E'],
];
const memberAssignments = incidence.map(([kind,startNodeId,endNodeId])=>({
  memberId:[kind,startNodeId,endNodeId].join('-'), startNodeId, endNodeId, areaIn2, elasticModulusPsi,
  secondMomentIn4:12, releaseStartRotation:true, releaseEndRotation:true,
}));
const near = (value,expected) => assert.ok(Number.isFinite(value) && Math.abs(value-expected)<1e-7,
  `${value} differs from the ideal analytical result ${expected}`);

test('eccentric horizontal top-heel load: reactions and signed heel axial forces match method of joints',()=>{
  const frame=build({roof,memberAssignments,supports});
  const fxLb=800;
  const loads=[{nodeId:'HL',fxLb,fyLb:0,momentLbIn:0}];
  const elastic=solveElasticFrame({...frame,loads});
  const pin=analyzePreliminaryRaisedHeelCommonTruss({roof,areaIn2,elasticModulusPsi,
    loadCase:{id:'HL-axial',description:'Synthetic positive horizontal load at top heel',jointLoads:[{nodeId:'HL',fxLb}]}});
  assert.equal(elastic.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(elastic.fabricationAuthorized,false);
  assert.equal(elastic.equilibrium.passes,true);
  assert.equal(pin.equilibrium.joints.passes,true);
  // Moment balance: -800(30)+R_E(240)=0; vertical and horizontal balance fix L.
  near(elastic.reactions.L.fxLb,-800);
  near(elastic.reactions.L.fyLb,-100);
  near(elastic.reactions.E.fxLb,0);
  near(elastic.reactions.E.fyLb,100);
  // At L the chord and web counter the pin reaction. At HL the top chord
  // and diagonal unit vectors are (2,1)/sqrt(5), (2,-1)/sqrt(5), so their
  // forces sum to -400sqrt(5) and their difference is +100sqrt(5).
  const expected = {'bottom-L-B1':800,'web-L-HL':100,'top-HL-Q1':-150*Math.sqrt(5),
    'web-HL-B1':-250*Math.sqrt(5)};
  for(const {memberId} of memberAssignments){
    const action=elastic.memberEndActions[memberId];
    assert.deepEqual(action.releasedRotationIndices,[2,5]);
    assert.ok(Object.hasOwn(pin.result.axialForceLb,memberId));
    const axial=pin.result.axialForceLb[memberId];
    const [start,sv,sm,end,ev,em]=action.localEndActions;
    near(-start,axial); near(end,axial);
    for(const v of [sv,sm,ev,em]) near(v,0);
    if(Object.hasOwn(expected,memberId)) near(end,expected[memberId]);
  }
  assert.equal(elastic.displacements.HL.rotationRad,null);
});
