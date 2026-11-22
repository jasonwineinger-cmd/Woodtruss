import assert from 'node:assert/strict';
import test from 'node:test';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';
import { buildDoubleFinkAuthoredElasticFrameModel as build } from '../dist/analysis/src/double-fink-authored-elastic-frame-model.js';

// Explicit synthetic connectivity and properties, not supplied from the model builder.
const incidence = [
  ['top','L','T1'], ['top','T1','T2'], ['top','T2','T3'], ['top','T3','T4'],
  ['top','T4','T5'], ['top','T5','T6'], ['top','T6','T7'], ['top','T7','E'],
  ['bottom','L','B1'], ['bottom','B1','B2'], ['bottom','B2','B3'], ['bottom','B3','B4'],
  ['bottom','B4','B5'], ['bottom','B5','B6'], ['bottom','B6','B7'], ['bottom','B7','E'],
  ['web','T1','B1'], ['web','T1','B2'], ['web','T2','B2'], ['web','T2','B3'],
  ['web','T2','B4'], ['web','T3','B4'], ['web','T4','B4'], ['web','T5','B4'],
  ['web','T6','B4'], ['web','T6','B5'], ['web','T6','B6'], ['web','T7','B6'], ['web','T7','B7'],
];
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

test('generic all-released Double Fink: unequal downward loads give the hand reactions and left bay force progression',()=>{
  const roof={family:'common',spanFt:24,pitchRisePer12:6};
  const frame=build({roof,memberAssignments,supports});
  const loads=[
    {nodeId:'T1',fxLb:0,fyLb:-400,momentLbIn:0},
    {nodeId:'T6',fxLb:0,fyLb:-800,momentLbIn:0},
  ];
  const r=solveElasticFrame({...frame,loads});
  assert.equal(r.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(r.fabricationAuthorized,false);
  assert.equal(r.equilibrium.passes,true);
  near(r.reactions.L.fxLb,0);
  near(r.reactions.E.fxLb,0);
  // Each panel is 36 in: R_E*288 = 400*36 + 800*216.
  near(r.reactions.L.fyLb,550);
  near(r.reactions.E.fyLb,650);
  // L and E: trigonometry of the opposing slopes gives the first/last
  // top and bottom forces. B1 is unloaded with collinear chords, so
  // T1→B1 is zero. At T1, let C=T1→T2 and D=T1→B2 be tension-positive:
  // C+D=-550√5 (horizontal), C-D=-150√5 (vertical). D supplies -200
  // vertical at B2; only T2→B2 counters it there.
  const expected={
    'top-L-T1':-550*Math.sqrt(5),'bottom-L-B1':1100,
    'top-T7-E':-650*Math.sqrt(5),'bottom-B7-E':1300,
    'web-T1-B1':0,'top-T1-T2':-350*Math.sqrt(5),
    'web-T1-B2':-200*Math.sqrt(5),'web-T2-B2':200,
  };
  assert.equal(Object.keys(r.memberEndActions).length,29);
  for(const [id,result] of Object.entries(r.memberEndActions)){
    assert.deepEqual(result.releasedRotationIndices,[2,5]);
    const [axialStart,vStart,mStart,axialEnd,vEnd,mEnd]=result.localEndActions;
    near(axialStart,-axialEnd);
    for(const action of [vStart,mStart,vEnd,mEnd]) near(action,0);
    if(Object.hasOwn(expected,id)) near(axialEnd,expected[id]);
  }
  for(const id of Object.keys(expected)) assert.ok(Object.hasOwn(r.memberEndActions,id));
  assert.equal(r.displacements.T1.rotationRad,null);
});
