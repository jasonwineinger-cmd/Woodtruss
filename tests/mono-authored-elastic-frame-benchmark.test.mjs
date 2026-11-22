import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePreliminaryMonoTruss } from '../dist/analysis/src/mono-analysis.js';
import { studyAuthoredMonoElasticFrameReactions as study } from '../dist/analysis/src/mono-authored-elastic-frame-study.js';

// Independent four-panel incidence and coordinates, not generated from the implementation.
const incidence = [
  ['top-L-T1','L','T1'], ['bottom-L-B1','L','B1'], ['web-T1-B1','T1','B1'],
  ['top-T1-T2','T1','T2'], ['bottom-B1-B2','B1','B2'], ['web-T2-B2','T2','B2'], ['web-T1-B2','T1','B2'],
  ['top-T2-T3','T2','T3'], ['bottom-B2-B3','B2','B3'], ['web-T3-B3','T3','B3'], ['web-T2-B3','T2','B3'],
  ['top-T3-T4','T3','T4'], ['bottom-B3-E','B3','E'], ['web-T4-E','T4','E'], ['web-T3-E','T3','E'],
];
const roof = {family:'mono',spanFt:20,pitchRisePer12:6};
const supports = [
  {nodeId:'L',fixX:true,fixY:true,fixRotation:false},
  {nodeId:'E',fixX:false,fixY:true,fixRotation:false},
];
const assignments = (release = false) => incidence.map(([memberId,startNodeId,endNodeId]) =>
  ({memberId,startNodeId,endNodeId,areaIn2:8,secondMomentIn4:12,elasticModulusPsi:1.2e6,
    releaseStartRotation:release, releaseEndRotation:release}));
const base = {modelId:'synthetic-mono',modelRevision:'r1',roof,supports};
const near = (actual, expected) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-7,
  `${actual} does not match independent equilibrium ${expected}`);
function vector(row,[x,y,m]) {
  near(row.fxLb,x); near(row.fyLb,y); near(row.momentLbIn,m);
}

test('signed weighted mono reactions and external moment close about the named nonzero node', () => {
  const result = study({
    ...base, memberAssignments:assignments(), originNodeId:'B2',
    sources:[
      {caseId:'high',sourceRef:'synthetic high end',loads:[{nodeId:'T4',fxLb:30,fyLb:-50,momentLbIn:12}]},
      {caseId:'low',sourceRef:'synthetic quarter point',loads:[{nodeId:'T1',fxLb:-10,fyLb:20,momentLbIn:-18}]},
    ],
    combinations:[
      {caseId:'down',sourceRef:'synthetic down',terms:[{caseId:'high',factor:1.5},{caseId:'low',factor:-.5}]},
      {caseId:'up',sourceRef:'synthetic up',terms:[{caseId:'low',factor:2},{caseId:'high',factor:-.5}]},
    ],
  });
  assert.equal(result.family,'mono');
  assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(Object.fromEntries(result.frame.nodes.map(n=>[n.id,[n.xIn,n.yIn]])),
    {L:[0,0],T1:[60,30],B1:[60,0],T2:[120,60],B2:[120,0],T3:[180,90],B3:[180,0],T4:[240,120],E:[240,0]});
  assert.deepEqual(result.frame.members.map(m=>[m.id,m.startNodeId,m.endNodeId]),incidence);
  assert.deepEqual(result.cases.map(row=>row.caseId),['down','up']);
  // About B2=(120,0), source moments are 120*(-50)-120*30+12=-9588
  // and -60*20-30*(-10)-18=-918. Vertical support arms are -120/+120.
  const oracle = [
    {applied:[50,-85,-13923],left:[-50,-15.5125,1861.5],right:[0,100.5125,12061.5]},
    {applied:[-35,65,2958],left:[35,-20.175,2421],right:[0,-44.825,-5379]},
  ];
  result.cases.forEach((row,index)=>{
    const expected = oracle[index];
    assert.equal(row.originNodeId,'B2');
    vector(row.applied,expected.applied);
    vector(row.residual,[0,0,0]);
    vector(row.supportRows.find(r=>r.nodeId==='L'),expected.left);
    vector(row.supportRows.find(r=>r.nodeId==='E'),expected.right);
  });
});

test('explicitly released mono frame reaches the hand-computed pin-joint reaction limit', () => {
  const loads = [{nodeId:'B2',fxLb:120,fyLb:0},{nodeId:'T3',fxLb:0,fyLb:-480}];
  const pin = analyzePreliminaryMonoTruss({roof,areaIn2:8,elasticModulusPsi:1.2e6,
    loadCase:{id:'direct',description:'synthetic pin-limit cross-check',jointLoads:loads}});
  const result = study({
    ...base, memberAssignments:assignments(true), originNodeId:'L',
    sources:[{caseId:'direct',sourceRef:'synthetic pin-limit loads',loads:loads.map(r=>({...r,momentLbIn:0}))}],
    combinations:[{caseId:'identity',sourceRef:'explicit unit weight',terms:[{caseId:'direct',factor:1}]}],
  });
  const row = result.cases[0];
  vector(row.applied,[120,-480,-86400]);
  vector(row.residual,[0,0,0]);
  const left = row.supportRows.find(r=>r.nodeId==='L'), right = row.supportRows.find(r=>r.nodeId==='E');
  vector(left,[-120,120,0]); vector(right,[0,360,86400]);
  near(left.fxLb,pin.result.reactionLb.L.x); near(left.fyLb,pin.result.reactionLb.L.y);
  near(right.fxLb,pin.result.reactionLb.E.x); near(right.fyLb,pin.result.reactionLb.E.y);
  assert.equal(result.fabricationAuthorized,false);
});

test('loaded member length and positive horizontal projection remain distinct mono action measures', () => {
  const memberId='top-L-T1';
  const input={
    ...base,roof:{...roof,spanFt:30},memberAssignments:assignments(),originNodeId:'L',
    sources:['horizontal-projection','member-length'].map(basis=>({
      caseId:basis,sourceRef:'synthetic transverse vector',loads:[],
      memberLoads:[{memberId,basis,qxLbPerIn:2,qyLbPerIn:-4}],
    })),
    combinations:['horizontal-projection','member-length'].map(basis=>({
      caseId:basis+'-case',sourceRef:'independent explicit unit case',terms:[{caseId:basis,factor:1}],
    })),
  };
  const {cases}=study(input);
  // L→T1 = (90,45), midpoint (45,22.5), member length 45√5 rather than 90.
  for (const [i,factor] of [1,Math.sqrt(5)/2].entries()) {
    const row=cases[i], action=row.appliedRows[0];
    near(action.loadedMeasureIn,90*factor);
    near(action.xFromOriginIn,45); near(action.yFromOriginIn,22.5);
    vector(row.applied,[180*factor,-360*factor,-20250*factor]);
    vector(row.residual,[0,0,0]);
    vector(row.supportRows.find(r=>r.nodeId==='L'),[-180*factor,303.75*factor,0]);
    vector(row.supportRows.find(r=>r.nodeId==='E'),[0,56.25*factor,20250*factor]);
  }
  input.sources[0].memberLoads[0].memberId='web-T1-B1';
  assert.throws(()=>study(input));
});
