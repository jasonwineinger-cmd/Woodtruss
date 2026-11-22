import test from 'node:test';
import assert from 'node:assert/strict';
import { generateScissorTopology } from '../dist/geometry/src/scissor.js';
import { compareAuthoredScissorElasticFrameReleases as compare } from '../dist/analysis/src/scissor-authored-release-comparison.js';

const near=(a,b,tol=1e-9)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<tol,`${a} vs ${b}`);

test('both explicit end releases reproduce uniform-load simple-span bending relative to the displaced scissor member chord',()=>{
  const roof={family:'scissor',spanFt:16,pitchRisePer12:6,bottomPitchRisePer12:3};
  const nodes=generateScissorTopology(roof);
  const memberId='top-L-Q1', E=1.2e6, I=32;
  const frame=compare({modelId:'scissor-local-bending',modelRevision:'v1',roof,
    memberAssignments:nodes.members.map(({id,start,end})=>({memberId:id,startNodeId:start,endNodeId:end,
      areaIn2:6,elasticModulusPsi:E,secondMomentIn4:I,releaseStartRotation:false,releaseEndRotation:false})),
    supports:[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},
      {nodeId:'E',fixX:false,fixY:true,fixRotation:false}],
    sources:[{caseId:'force',sourceRef:'synthetic authored uniform action',loads:[],
      memberLoads:[{memberId,basis:'member-length',qxLbPerIn:0,qyLbPerIn:-4}]}],
    combinations:[{caseId:'once',sourceRef:'explicit unit factor',terms:[{caseId:'force',factor:1}]}],
    originNodeId:'L',memberIds:[memberId],
    releaseVariants:[{variantId:'base',sourceRef:'explicit initial rigid flags only',overrides:[]},
      {variantId:'both',sourceRef:'explicit ideal rotations only',overrides:[{memberId,startNodeId:'L',endNodeId:'Q1',
        releaseStartRotation:true,releaseEndRotation:true}]}]});
  // The top panel runs (48,24). Local transverse intensity is the projection
  // of global downward intensity onto local +y. Removing the moving straight
  // chord leaves the textbook simple-span solution for this one member.
  const L=Math.hypot(48,24), q=-4*48/L;
  const [base,both]=frame.variants.map(v=>v.cases[0]);
  const relative=both.memberDeflectionExtrema[memberId].chordRelativeTransverseIn;
  near(relative.min.stationIn,L/2,1e-6);
  near(relative.min.valueIn,5*q*L**4/(384*E*I));
  near(relative.max.valueIn,0);
  assert.notEqual(base.memberDeflectionExtrema[memberId].chordRelativeTransverseIn.min.valueIn,relative.min.valueIn);
  near(both.physicalResultant.support.fyLb,4*L);
  near(both.physicalResultant.support.momentLbIn,4*L*24);
  near(base.physicalResultant.support.fyLb,both.physicalResultant.support.fyLb);
  near(base.physicalResultant.support.momentLbIn,both.physicalResultant.support.momentLbIn);
  assert.equal(frame.fabricationAuthorized,false);
  assert.equal(both.memberDeflectionExtrema[memberId].serviceabilityApproved,false);
});
