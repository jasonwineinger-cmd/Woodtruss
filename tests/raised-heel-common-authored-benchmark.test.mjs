import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredRaisedHeelCommonElasticFrameReactions as study } from '../dist/analysis/src/raised-heel-common-authored-elastic-frame-study.js';

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
const source = (caseId,nodeId,fxLb,fyLb) => ({
  caseId,sourceRef:'synthetic equilibrium benchmark',loads:[{nodeId,fxLb,fyLb,momentLbIn:0}],
});
const combo = (caseId,horizontal,withPeak) => ({
  caseId,sourceRef:'explicit synthetic weight',terms:[
    {caseId:horizontal,factor:1.5},
    ...(withPeak?[{caseId:'peak',factor:-0.75}]:[]),
  ],
});

test('raised heel retains its horizontal action lever arm under explicit signed weighting', () => {
  const result = study({
    modelId:'synthetic-raised-heel', modelRevision:'r1',
    roof:{family:'common',spanFt:40,pitchRisePer12:6,heelHeightIn:12},
    supports:[
      {nodeId:'L',fixX:true,fixY:true,fixRotation:false},
      {nodeId:'E',fixX:false,fixY:true,fixRotation:false},
    ],
    memberAssignments:incidence.map(([kind,startNodeId,endNodeId])=>({
      memberId:`${kind}-${startNodeId}-${endNodeId}`,startNodeId,endNodeId,
      areaIn2:8,secondMomentIn4:12,elasticModulusPsi:1.2e6,
      releaseStartRotation:false,releaseEndRotation:false,
    })),
    originNodeId:'L',
    sources:[source('heel','HL',80,0),source('bearing','L',80,0),source('peak','R',0,400)],
    combinations:[combo('heel-only','heel',false),combo('bearing-only','bearing',false),
      combo('heel-plus-peak','heel',true),combo('bearing-plus-peak','bearing',true)],
  });
  assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(Object.fromEntries(result.frame.nodes.map(n=>[n.id,[n.xIn,n.yIn]])),{
    L:[0,0],HL:[0,12],Q1:[120,72],R:[240,132],Q3:[360,72],HE:[480,12],E:[480,0],
    B1:[120,0],B2:[240,0],B3:[360,0],
  });
  assert.deepEqual(result.cases.map(c=>c.caseId),['heel-only','bearing-only','heel-plus-peak','bearing-plus-peak']);
  // Taking CCW-positive moments about L gives -12*120 for HL, and zero for L.
  // The explicitly negatively weighted peak source adds 240*(-300).
  // The E vertical reaction closes the applied moment over 480 in; L closes the forces.
  const oracle = [
    [[120,0,-1440],[-120,-3,0],[0,3,1440]],
    [[120,0,0],[-120,0,0],[0,0,0]],
    [[120,-300,-73440],[-120,147,0],[0,153,73440]],
    [[120,-300,-72000],[-120,150,0],[0,150,72000]],
  ];
  for (const [i,row] of result.cases.entries()) {
    const [applied,left,right]=oracle[i];
    assert.equal(row.originNodeId,'L');
    vector(row.applied,applied);
    vector(row.supportRows.find(r=>r.nodeId==='L'),left);
    vector(row.supportRows.find(r=>r.nodeId==='E'),right);
    vector(row.residual,[0,0,0]);
  }
});
