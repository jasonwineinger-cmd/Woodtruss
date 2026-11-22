import test from 'node:test';
import assert from 'node:assert/strict';
import { generateScissorTopology } from '../dist/geometry/src/scissor.js';
import { studyScissorModeledThreeGaugeRestraint as study } from '../dist/analysis/src/scissor-modeled-three-gauge-restraint-study.js';

const near=(a,b,tol=1e-9)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<tol,`${a} vs ${b}`);

test('modeled upward/downward reversal remains signed at all gauges and reactions under one bilateral restraint',()=>{
  const roof={family:'scissor',spanFt:16,pitchRisePer12:6,bottomPitchRisePer12:3};
  const topology=generateScissorTopology(roof);
  const out=study({modelId:'sign-reversal',modelRevision:'r01',roof,
    memberAssignments:topology.members.map(({id,start,end})=>({memberId:id,startNodeId:start,endNodeId:end,
      areaIn2:6,secondMomentIn4:18,elasticModulusPsi:1e6,releaseStartRotation:false,releaseEndRotation:false})),
    supports:[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},{nodeId:'E',fixX:false,fixY:true,fixRotation:false}],
    sources:[{caseId:'unit',sourceRef:'synthetic signed hand basis',loads:[{nodeId:'Q3',fxLb:0,fyLb:-100,momentLbIn:0}]}],
    combinations:[{caseId:'negative',sourceRef:'explicit reversal',terms:[{caseId:'unit',factor:-2}]},
      {caseId:'positive',sourceRef:'original direction',terms:[{caseId:'unit',factor:1}]}],
    bearingNodeId:'E',originNodeId:'L',restraint:{kind:'spring',stiffnessLbPerIn:20000},
    gauges:[{gaugeId:'near',nodeId:'Q1'},{gaugeId:'peak',nodeId:'R'},{gaugeId:'far',nodeId:'Q3'}]});
  assert.equal(out.bearingNodeId,'E');
  assert.equal(out.originNodeId,'L');
  assert.deepEqual(out.restraint,{kind:'spring',stiffnessLbPerIn:20000});
  const [reverse,direct]=out.rows;
  assert.deepEqual(out.rows.map(row=>row.caseId),['negative','positive']);
  for(const state of ['unrestrained','restrained']){
    assert.deepEqual(direct[state].gauges.map(g=>g.nodeId),['Q1','R','Q3']);
    for(let i=0;i<3;i++)near(reverse[state].gauges[i].downwardIn,-2*direct[state].gauges[i].downwardIn);
    near(reverse[state].averageDownwardIn,-2*direct[state].averageDownwardIn);
  }
  assert.ok(direct.restrained.gauges[2].downwardIn>0);
  assert.ok(reverse.restrained.gauges[2].downwardIn<0);
  near(direct.totalBearingReactionLb,100);near(reverse.totalBearingReactionLb,-200);
  near(direct.bearingVerticalReactionsLb.find(r=>r.nodeId==='E').fyLb,75);
  near(reverse.bearingVerticalReactionsLb.find(r=>r.nodeId==='L').fyLb,-50);
  near(reverse.restraintForceLb,-2*direct.restraintForceLb);
  assert.equal(out.fabricationAuthorized,false);
  assert.equal(out.status,'PRELIMINARY_MODELED_NOT_OBSERVED');
});
