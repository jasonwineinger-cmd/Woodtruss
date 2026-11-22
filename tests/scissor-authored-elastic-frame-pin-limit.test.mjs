import test from 'node:test';
import assert from 'node:assert/strict';
import {generateScissorTopology} from '../dist/geometry/src/scissor.js';
import {analyzePreliminaryScissorExplicit} from '../dist/analysis/src/scissor-explicit-analysis.js';
import {studyAuthoredScissorElasticFrameReactions as study} from '../dist/analysis/src/scissor-authored-elastic-frame-study.js';

const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-7,`${a} is not ${b}`);

test('explicitly releasing every scissor member matches the pin-joint reaction limit at full allowed span',()=>{
  const roof={family:'scissor',spanFt:50,pitchRisePer12:8,bottomPitchRisePer12:3};
  const topology=generateScissorTopology(roof);
  const areaIn2=6.5,elasticModulusPsi=1.2e6;
  const loads=[{nodeId:'B2',fxLb:120,fyLb:0},{nodeId:'Q3',fxLb:0,fyLb:-480}];
  const pin=analyzePreliminaryScissorExplicit({roof,areaIn2,elasticModulusPsi,
    loadCase:{id:'direct',description:'hand case only',jointLoads:loads}});
  const report=study({modelId:'scissor-pin-limit',modelRevision:'r01',roof,
    memberAssignments:topology.members.map(({id,start,end})=>({memberId:id,startNodeId:start,endNodeId:end,
      areaIn2,elasticModulusPsi,secondMomentIn4:23,releaseStartRotation:true,releaseEndRotation:true})),
    supports:[{nodeId:'E',fixX:false,fixY:true,fixRotation:false},
      {nodeId:'L',fixX:true,fixY:true,fixRotation:false}],
    sources:[{caseId:'explicit',sourceRef:'synthetic hand case',loads:loads.map(r=>({...r,momentLbIn:0}))}],
    combinations:[{caseId:'signed',sourceRef:'explicit identity factor',terms:[{caseId:'explicit',factor:1}]}],
    originNodeId:'L'});
  const actual=report.cases[0];
  assert.equal(actual.applied.momentLbIn,-225000);
  assert.equal(actual.supportRows.length,2);
  const left=actual.supportRows.find(row=>row.nodeId==='L'),right=actual.supportRows.find(row=>row.nodeId==='E');
  near(left.fxLb,-120);near(left.fyLb,105);near(right.fxLb,0);near(right.fyLb,375);
  near(left.fxLb,pin.result.reactionLb.L.x);near(left.fyLb,pin.result.reactionLb.L.y);
  near(right.fxLb,pin.result.reactionLb.E.x);near(right.fyLb,pin.result.reactionLb.E.y);
  assert.equal(left.coupleLbIn,0);assert.equal(right.coupleLbIn,0);
  assert.equal(report.fabricationAuthorized,false);
});
