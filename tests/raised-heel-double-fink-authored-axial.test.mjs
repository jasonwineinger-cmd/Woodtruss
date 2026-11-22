import assert from 'node:assert/strict';
import test from 'node:test';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';
import { buildRaisedHeelDoubleFinkAuthoredElasticFrameModel as build } from '../dist/analysis/src/raised-heel-double-fink-authored-elastic-frame-model.js';

// Explicit synthetic connectivity and properties, not supplied from the model builder.
const incidence = [
  ['top','HL','T1'], ['top','T1','T2'], ['top','T2','T3'], ['top','T3','T4'],
  ['top','T4','T5'], ['top','T5','T6'], ['top','T6','T7'], ['top','T7','HE'],
  ['bottom','L','B1'], ['bottom','B1','B2'], ['bottom','B2','B3'], ['bottom','B3','B4'],
  ['bottom','B4','B5'], ['bottom','B5','B6'], ['bottom','B6','B7'], ['bottom','B7','E'],
  ['web','T1','B1'], ['web','T1','B2'], ['web','T2','B2'], ['web','T2','B3'],
  ['web','T2','B4'], ['web','T3','B4'], ['web','T4','B4'], ['web','T5','B4'],
  ['web','T6','B4'], ['web','T6','B5'], ['web','T6','B6'], ['web','T7','B6'], ['web','T7','B7'],
];
incidence.push(['web','L','HL'],['web','HL','B1'],['web','B7','HE'],['web','HE','E']);
const memberAssignments = incidence.map(([kind,startNodeId,endNodeId])=>({
  memberId:[kind,startNodeId,endNodeId].join('-'),startNodeId,endNodeId,
  areaIn2:8,elasticModulusPsi:1.2e6,secondMomentIn4:12,
  releaseStartRotation:true,releaseEndRotation:true,
}));
const supports = [
  {nodeId:'L',fixX:true,fixY:true,fixRotation:false},
  {nodeId:'E',fixX:false,fixY:true,fixRotation:false},
];
function near(actual,expected) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
}

test('opposing unequal top-heel actions drive both distinct heel wedges in the released idealization',()=>{
  const roof={family:'common',spanFt:20,pitchRisePer12:6,heelHeightIn:30};
  const frame=build({roof,memberAssignments,supports});
  const r=solveElasticFrame({...frame,loads:[
    {nodeId:'HL',fxLb:800,fyLb:0,momentLbIn:0},
    {nodeId:'HE',fxLb:-400,fyLb:0,momentLbIn:0},
  ]});
  assert.equal(r.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(r.fabricationAuthorized,false);
  assert.equal(r.equilibrium.passes,true);
  near(r.reactions.L.fxLb,-400);
  near(r.reactions.E.fxLb,0);
  // About L: 240 R_E - 30(800 - 400) = 0.
  near(r.reactions.L.fyLb,-50);
  near(r.reactions.E.fyLb,50);
  // At L and E, members are horizontal and vertical. Their axial forces
  // counter the bearing reactions. At HL, write a=T_top/√5, b=T_diag/√2:
  // 2a+b=-800 and a-b=+50. At HE: -2a-b=+400 and a-b=-50.
  const expected={
    'bottom-L-B1':400,'web-L-HL':50,'top-HL-T1':-250*Math.sqrt(5),'web-HL-B1':-300*Math.sqrt(2),
    'bottom-B7-E':0,'web-HE-E':-50,'top-T7-HE':-150*Math.sqrt(5),'web-B7-HE':-100*Math.sqrt(2),
  };
  assert.equal(Object.keys(r.memberEndActions).length,33);
  for(const [id,result] of Object.entries(r.memberEndActions)){
    assert.deepEqual(result.releasedRotationIndices,[2,5]);
    const [axialStart,vStart,mStart,axialEnd,vEnd,mEnd]=result.localEndActions;
    near(axialStart,-axialEnd);
    for(const action of [vStart,mStart,vEnd,mEnd]) near(action,0);
    if(Object.hasOwn(expected,id)) near(axialEnd,expected[id]);
  }
  for(const id of Object.keys(expected)) assert.ok(Object.hasOwn(r.memberEndActions,id));
  for(const heel of ['HL','HE']) assert.equal(r.displacements[heel].rotationRad,null);
});
