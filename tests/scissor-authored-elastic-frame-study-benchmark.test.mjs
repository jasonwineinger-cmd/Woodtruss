import assert from 'node:assert/strict';
import test from 'node:test';
import {studyAuthoredScissorElasticFrameReactions as study} from '../dist/analysis/src/scissor-authored-elastic-frame-study.js';

// The benchmark names each expected incidence independently of the generator;
// it never derives fixture assignments or expected coordinates from the API.
const incidence=[
  ['top-L-Q1','L','Q1'],['top-Q1-R','Q1','R'],['top-R-Q3','R','Q3'],['top-Q3-E','Q3','E'],
  ['bottom-L-B1','L','B1'],['bottom-B1-B2','B1','B2'],['bottom-B2-B3','B2','B3'],['bottom-B3-E','B3','E'],
  ['web-Q1-B1','Q1','B1'],['web-Q1-B2','Q1','B2'],['web-R-B2','R','B2'],
  ['web-Q3-B2','Q3','B2'],['web-Q3-B3','Q3','B3'],
];
const memberAssignments=incidence.map(([memberId,startNodeId,endNodeId],index)=>({
  memberId,startNodeId,endNodeId,areaIn2:8+index/16,secondMomentIn4:12+index/16,elasticModulusPsi:1.2e6+1000*index,
  releaseStartRotation:false,releaseEndRotation:false,
}));
const supports=[
  {nodeId:'L',fixX:true,fixY:true,fixRotation:false},
  {nodeId:'E',fixX:false,fixY:true,fixRotation:false},
];
const roof={family:'scissor',spanFt:20,pitchRisePer12:6,bottomPitchRisePer12:3};
const fixture={
  modelId:'independent-scissor-reaction',modelRevision:'r1',originNodeId:'L',
  roof,memberAssignments,supports,
  sources:[
    {caseId:'apex',sourceRef:'Hand-authored synthetic apex',
      loads:[{nodeId:'R',fxLb:30,fyLb:-50,momentLbIn:12}],
      memberLoads:[{memberId:'top-L-Q1',basis:'horizontal-projection',qxLbPerIn:1,qyLbPerIn:-2}]},
    {caseId:'off-center',sourceRef:'Hand-authored synthetic quarter chord',
      loads:[{nodeId:'Q3',fxLb:-10,fyLb:20,momentLbIn:-18}]},
  ],
  combinations:[
    {caseId:'weighted-down',sourceRef:'Illustrative signed down combination',
      terms:[{caseId:'apex',factor:1.5},{caseId:'off-center',factor:-.5}]},
    {caseId:'weighted-up',sourceRef:'Illustrative signed up combination',
      terms:[{caseId:'off-center',factor:2},{caseId:'apex',factor:-.5}]},
  ],
};
function near(actual,expected) {
  assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<1e-7,
    `${actual} does not match independent equilibrium ${expected}`);
}
function vector(actual,[x,y,m]) {
  near(actual.fxLb,x);near(actual.fyLb,y);near(actual.momentLbIn,m);
}

test('real eight-joint scissor produces independent signed weighted bearing reactions',()=>{
  const result=study(structuredClone(fixture));
  assert.equal(result.family,'scissor');
  assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(Object.fromEntries(result.frame.nodes.map(n=>[n.id,[n.xIn,n.yIn]])),{
    L:[0,0],Q1:[60,30],R:[120,60],Q3:[180,30],E:[240,0],
    B1:[60,15],B2:[120,30],B3:[180,15],
  });
  assert.deepEqual(result.frame.members.map(m=>[m.id,m.startNodeId,m.endNodeId]),incidence);
  assert.deepEqual(result.frame.members.map(({id,...row})=>({memberId:id,...row})),memberAssignments);
  assert.deepEqual(result.frame.supports,supports);
  assert.deepEqual(result.cases.map(row=>row.caseId),['weighted-down','weighted-up']);

  // Apex force/couple moment about L = 120(-50) - 60(30) + 12.
  // Projected q acts on 60 horizontal inches, giving (+60,-120) at (30,15)
  // with moment -4500. Apex case total (+90,-170,-12288).
  // Q3 is at (180,30), off-center total (-10,+20,+3882).
  const expected=[
    {force:[140,-265,-20373],left:[-140,180.1125,0],right:[0,84.8875,20373]},
    {force:[-65,125,13908],left:[65,-67.05,0],right:[0,-57.95,-13908]},
  ];
  result.cases.forEach((row,i)=>{
    assert.equal(row.originNodeId,'L');
    vector(row.applied,expected[i].force);
    vector(row.residual,[0,0,0]);
    assert.deepEqual(row.supportRows.map(r=>r.nodeId),['L','E']);
    vector(row.supportRows[0],expected[i].left);
    vector(row.supportRows[1],expected[i].right);
    row.supportRows.forEach(r=>assert.equal(r.coupleLbIn,0));
  });
  const uniform=result.cases[0].appliedRows.find(row=>row.kind==='uniform');
  assert.equal(uniform.memberId,'top-L-Q1');
  assert.equal(uniform.loadedMeasureIn,60);
  vector(uniform,[90,-180,-6750]);
  assert.deepEqual(result.combinationProvenance[1].terms,[
    {caseId:'off-center',sourceRef:'Hand-authored synthetic quarter chord',factor:2},
    {caseId:'apex',sourceRef:'Hand-authored synthetic apex',factor:-.5},
  ]);
});

test('hold over-span, incomplete assignments, and imaginary force targets',()=>{
  const incomplete=structuredClone(fixture);
  incomplete.memberAssignments.pop();
  assert.throws(()=>study(incomplete),/assignment/i);
  const reversed=structuredClone(fixture);
  const first=reversed.memberAssignments[0];
  [first.startNodeId,first.endNodeId]=[first.endNodeId,first.startNodeId];
  assert.throws(()=>study(reversed),/direction|directed/i);
  assert.throws(()=>study({...structuredClone(fixture),roof:{...roof,spanFt:50.01}}));
  const invalid=structuredClone(fixture);
  invalid.sources[1].loads[0].nodeId='not-a-scissor-joint';
  assert.throws(()=>study(invalid));
});
