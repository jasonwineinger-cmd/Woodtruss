import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredRaisedHeelCommonElasticFrameJointBalance as study } from '../dist/analysis/src/raised-heel-common-authored-elastic-frame-joint-balance.js';

const incidence = [
  ['top','HL','Q1'],['top','Q1','R'],['top','R','Q3'],['top','Q3','HE'],
  ['bottom','L','B1'],['bottom','B1','B2'],['bottom','B2','B3'],['bottom','B3','E'],
  ['web','Q1','B1'],['web','Q1','B2'],['web','R','B2'],['web','Q3','B2'],['web','Q3','B3'],
  ['web','L','HL'],['web','HL','B1'],['web','B3','HE'],['web','HE','E'],
];
const near = (value, expected) => assert.ok(Number.isFinite(value) && Math.abs(value-expected)<1e-7,
  `${value} does not match hand equilibrium ${expected}`);
const vector = (row,[x,y,m]) => {
  near(row.fxLb,x); near(row.fyLb,y); near(row.momentLbIn,m);
};

test('a true raised heel couple reaches only its rotation-connected incident end', () => {
  const result = study({
    modelId:'synthetic-raised-heel-joint',modelRevision:'r1',
    roof:{family:'common',spanFt:40,pitchRisePer12:6,heelHeightIn:12},
    supports:[
      {nodeId:'L',fixX:true,fixY:true,fixRotation:false},
      {nodeId:'E',fixX:false,fixY:true,fixRotation:false},
    ],
    memberAssignments:incidence.map(([kind,startNodeId,endNodeId])=>({
      memberId:`${kind}-${startNodeId}-${endNodeId}`,startNodeId,endNodeId,
      areaIn2:8,secondMomentIn4:12,elasticModulusPsi:1.2e6,
      releaseStartRotation: startNodeId!=='HL'||kind!=='top',
      releaseEndRotation:true,
    })),
    sources:[{caseId:'heel-couple',sourceRef:'synthetic upper heel couple',
      loads:[{nodeId:'HL',fxLb:0,fyLb:0,momentLbIn:2400}]}],
    combinations:[
      {caseId:'forward',sourceRef:'explicit unit factor',terms:[{caseId:'heel-couple',factor:1}]},
      {caseId:'reverse',sourceRef:'explicit reversed factor',terms:[{caseId:'heel-couple',factor:-.5}]},
    ],
    caseJoints:['forward','reverse'].map(caseId=>({caseId,nodeIds:['HL','L','E']})),
  });
  assert.equal(result.family,'common');
  assert.equal(result.subtype,'symmetric-raised-heel-reference');
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(result.cases.map(row=>row.caseId),['forward','reverse']);
  // The single connected HL rotation transmits the exact opposite couple.
  // Global moments about the true pin L require E_y=-2400/480=-5 lb,
  // so L_y=+5 lb. Neither true bearing takes a support couple.
  for(const [index,factor] of [1,-.5].entries()){
    const {joints}=result.cases[index];
    assert.deepEqual(joints.map(row=>row.nodeId),['HL','L','E']);
    const [heel,left,right]=joints;
    assert.deepEqual(heel.incident.map(row=>row.memberId).sort(),['top-HL-Q1','web-HL-B1','web-L-HL']);
    for(const row of heel.incident){
      if(row.memberId==='top-HL-Q1'){
        assert.deepEqual([row.startNodeId,row.endNodeId,row.at],['HL','Q1','start']);
        near(row.momentLbIn,-2400*factor);
      } else near(row.momentLbIn,0);
    }
    vector(heel.applied,[0,0,2400*factor]);
    vector(heel.support,[0,0,0]);
    vector(left.applied,[0,0,0]); vector(left.support,[0,5*factor,0]);
    vector(right.applied,[0,0,0]); vector(right.support,[0,-5*factor,0]);
    for(const row of joints) vector(row.residual,[0,0,0]);
  }
});
