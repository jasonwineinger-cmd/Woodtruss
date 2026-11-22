import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredElasticFrameCombinationJointBalance as study }
  from '../dist/analysis/src/elastic-frame-authored-combination-joint-balance.js';

const near=(value,expected)=>assert.ok(Number.isFinite(value)&&Math.abs(value-expected)<1e-8,`${value} != ${expected}`);
const vector=(row,[x,y,m],factor=1)=>{
  near(row.fxLb,x*factor); near(row.fyLb,y*factor); near(row.momentLbIn,m*factor);
};

test('selected joints reconcile the hand-calculated inclined-roller normal and incident member actions',()=>{
  const frame={
    nodes:[{id:'L',xIn:0,yIn:0},{id:'M',xIn:6,yIn:0},{id:'E',xIn:12,yIn:0}],
    members:[['left','L','M'],['right','M','E']].map(([id,startNodeId,endNodeId])=>({
      id,startNodeId,endNodeId,areaIn2:8,secondMomentIn4:12,elasticModulusPsi:1e6,
      releaseStartRotation:false,releaseEndRotation:false,
    })),
    supports:[
      {nodeId:'L',fixX:true,fixY:true,fixRotation:false},
      {nodeId:'E',freeDx:3,freeDy:4,fixRotation:false},
    ],
  };
  const result=study({
    modelId:'synthetic-inclined-midpoint',modelRevision:'r1',frame,
    sources:[{caseId:'mid',sourceRef:'synthetic center load',
      loads:[{nodeId:'M',fxLb:30,fyLb:-120,momentLbIn:0}]}],
    combinations:[
      {caseId:'forward',sourceRef:'explicit unit factor',terms:[{caseId:'mid',factor:1}]},
      {caseId:'reverse',sourceRef:'explicit negative factor',terms:[{caseId:'mid',factor:-.5}]},
    ],
    caseJoints:['forward','reverse'].map(caseId=>({caseId,nodeIds:['E','M','L']})),
  });
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(result.cases.map(row=>row.caseId),['forward','reverse']);
  // About L, 12*Ey = 6*120, giving Ey=60. Normal (-4/5,3/5)
  // gives Ex=-80; force equilibrium gives (Lx,Ly)=(50,60).
  // Each half beam has 6 in of lever arm times 60 lb, giving opposite
  // 360 lb-in actions on the middle node with no applied nodal couple.
  for(const [index,factor] of [1,-.5].entries()){
    const {joints}=result.cases[index];
    assert.deepEqual(joints.map(row=>row.nodeId),['E','M','L']);
    const [right,middle,left]=joints;
    vector(right.support,[-80,60,0],factor);
    near((3*right.support.fxLb+4*right.support.fyLb)/5,0);
    near((-4*right.support.fxLb+3*right.support.fyLb)/5,100*factor);
    assert.deepEqual(right.incident.map(({memberId,startNodeId,endNodeId,at})=>[memberId,startNodeId,endNodeId,at]),
      [['right','M','E','end']]);
    vector(right.incident[0],[80,-60,0],factor);
    vector(left.support,[50,60,0],factor);
    vector(left.incident[0],[-50,-60,0],factor);
    vector(middle.applied,[30,-120,0],factor);
    vector(middle.support,[0,0,0]);
    assert.equal(middle.incident.length,2);
    vector(middle.incident.find(row=>row.memberId==='left'),[50,60,-360],factor);
    vector(middle.incident.find(row=>row.memberId==='right'),[-80,60,360],factor);
    for(const row of joints) vector(row.residual,[0,0,0]);
  }
});
