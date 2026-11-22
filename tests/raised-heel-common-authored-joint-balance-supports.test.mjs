import test from 'node:test';
import assert from 'node:assert/strict';
import {studyAuthoredRaisedHeelCommonElasticFrameJointBalance as study}
  from '../dist/analysis/src/raised-heel-common-authored-elastic-frame-joint-balance.js';

const incidence=[
 ['top','HL','Q1'],['top','Q1','R'],['top','R','Q3'],['top','Q3','HE'],
 ['bottom','L','B1'],['bottom','B1','B2'],['bottom','B2','B3'],['bottom','B3','E'],
 ['web','Q1','B1'],['web','Q1','B2'],['web','R','B2'],['web','Q3','B2'],['web','Q3','B3'],
 ['web','L','HL'],['web','HL','B1'],['web','B3','HE'],['web','HE','E'],
];
const components=['fxLb','fyLb','momentLbIn'];
const xyz=(row,expected)=>components.forEach((key,i)=>{
 assert.ok(Number.isFinite(row[key])&&Math.abs(row[key]-expected[i])<1e-7, `${key}: ${row[key]} != ${expected[i]}`);
});
const sum=(rows)=>Object.fromEntries(components.map(key=>[key,rows.reduce((s,row)=>s+row[key],0)]));

test('right top heel and right bearing preserve separate lateral-action lever arms in joint receipts',()=>{
 const expectedCases=[['upper','HE',2.5],['seat','E',0]];
 const result=study({
  modelId:'synthetic-right-heel',modelRevision:'r1',
  roof:{family:'common',spanFt:40,pitchRisePer12:6,heelHeightIn:12},
  memberAssignments:incidence.map(([kind,startNodeId,endNodeId])=>({
   memberId:`${kind}-${startNodeId}-${endNodeId}`,startNodeId,endNodeId,
   areaIn2:8,secondMomentIn4:12,elasticModulusPsi:1.2e6,releaseStartRotation:true,releaseEndRotation:true,
  })),
  supports:[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},{nodeId:'E',fixX:false,fixY:true,fixRotation:false}],
  sources:expectedCases.map(([caseId,nodeId])=>({
   caseId:caseId+'-source',sourceRef:'independent synthetic lateral load',
   loads:[{nodeId,fxLb:100,fyLb:0,momentLbIn:0}],
  })),
  combinations:expectedCases.map(([caseId])=>({
   caseId,sourceRef:'explicit factor',terms:[{caseId:caseId+'-source',factor:1}],
  })),
  caseJoints:expectedCases.map(([caseId])=>({caseId,nodeIds:['HE','E','L']})),
 });
 assert.equal(result.subtype,'symmetric-raised-heel-reference');
 assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(result.fabricationAuthorized,false);
 for(const [i,[caseId,target,ryE]] of expectedCases.entries()){
  const row=result.cases[i];
  assert.equal(row.caseId,caseId);
  const [heel,seat,left]=row.joints;
  assert.deepEqual([heel.nodeId,seat.nodeId,left.nodeId],['HE','E','L']);
  xyz(heel.applied,[target==='HE'?100:0,0,0]);
  xyz(seat.applied,[target==='E'?100:0,0,0]);
  // Moment about L: R_E*480 - 100*y_target = 0; y at HE is 12 in and E is 0.
  xyz(heel.support,[0,0,0]);
  xyz(seat.support,[0,ryE,0]);
  xyz(left.support,[-100,-ryE,0]);
  xyz(sum(heel.incident),[target==='HE'?-100:0,0,0]);
  xyz(sum(seat.incident),[target==='E'?-100:0,-ryE,0]);
  xyz(sum(left.incident),[100,ryE,0]);
  for(const joint of row.joints) xyz(joint.residual,[0,0,0]);
 }
});
