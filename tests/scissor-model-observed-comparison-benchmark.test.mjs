import assert from 'node:assert/strict';
import test from 'node:test';
import {solveElasticFrame as solve} from '../dist/analysis/src/elastic-frame-solve.js';
import {compareScissorModeledAndObservedResponse as compare} from '../dist/analysis/src/scissor-model-observed-comparison.js';

const members=[
  ['top','L','Q1'],['top','Q1','R'],['top','R','Q3'],['top','Q3','E'],
  ['bottom','L','B1'],['bottom','B1','B2'],['bottom','B2','B3'],['bottom','B3','E'],
  ['web','Q1','B1'],['web','Q1','B2'],['web','R','B2'],['web','Q3','B2'],['web','Q3','B3'],
].map(([kind,startNodeId,endNodeId],i)=>({
  memberId:`${kind}-${startNodeId}-${endNodeId}`,startNodeId,endNodeId,
  areaIn2:8+i/16,secondMomentIn4:12+i/16,elasticModulusPsi:1200000+1000*i,
  releaseStartRotation:false,releaseEndRotation:false,
}));
const nodes=[
  ['L',0,0],['Q1',60,30],['R',120,60],['Q3',180,30],['E',240,0],
  ['B1',60,15],['B2',120,30],['B3',180,15],
].map(([id,xIn,yIn])=>({id,xIn,yIn}));
const supports=[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},{nodeId:'E',fixX:false,fixY:true,fixRotation:false}];
const frame={nodes,members:members.map(({memberId,...row})=>({id:memberId,...row})),supports};
const gauges=[{gaugeId:'m-left',nodeId:'Q1'},{gaugeId:'m-ridge',nodeId:'R'},{gaugeId:'m-right',nodeId:'Q3'}];
const authoredStepIds=['s-one','s-two','s-three'];
const modeledCaseIds=['m-one','m-two','m-three'];
const gaugeIds=['o-left','o-ridge','o-right'];
const bearingIds=['o-bearing-l','o-bearing-r'];
const biasGaugeIn=[.006,-.002,.004];
const biasBearingLb=[1.5,-1.25];
const k=25000;
const action=(nodeId,fxLb,fyLb)=>({nodeId,fxLb,fyLb,momentLbIn:0});

function fixture(){
  // Do not use the model/observed adapters to manufacture expected output.
  // Generate *synthetic* lab-side values from a direct raw-frame recomputation,
  // then add intentionally known biases. These are not measured USDA data.
  const f=solve({...frame,loads:[action('E',1,0)]}).displacements.E.uxIn;
  const observedSamples=[100,200,300].map((P,i)=>{
    const roofAction=action('R',0,-P);
    const u0=solve({...frame,loads:[roofAction]}).displacements.E.uxIn;
    const correction=-k*u0/(1+k*f);
    const result=solve({...frame,loads:[roofAction,action('E',correction,0)]});
    return {stepId:authoredStepIds[i],
      downwardGaugeIn:gauges.map(({nodeId},j)=>-result.displacements[nodeId].uyIn+biasGaugeIn[j]),
      verticalBearingReactionLb:biasBearingLb.map(delta=>P/2+delta)};
  });
  const modeledInput={
    modelId:'synthetic-scissor-comparison',modelRevision:'r1',roof:{family:'scissor',spanFt:20,pitchRisePer12:6,bottomPitchRisePer12:3},
    memberAssignments:members,supports,bearingNodeId:'E',originNodeId:'L',restraint:{kind:'spring',stiffnessLbPerIn:k},gauges,
    sources:[{caseId:'unit-step',sourceRef:'Synthetic 100-lb ridge load',loads:[action('R',0,-100)]}],
    combinations:modeledCaseIds.map((caseId,i)=>({
      caseId,sourceRef:`Explicit synthetic load factor ${i+1}`,terms:[{caseId:'unit-step',factor:i+1}],
    })),
  };
  const observedInput={
    specimenId:'synthetic-specimen',testId:'synthetic-test',sourceRef:'Synthetic direct-solver plus signed biases; no historical data',
    gaugeIds,bearingIds,samples:observedSamples,fitWindow:{firstStepId:authoredStepIds[0],lastStepId:authoredStepIds[2]},
  };
  const scope={
    protocolId:'synthetic-protocol',reviewEvidenceId:'synthetic-evidence',
    specimenId:observedInput.specimenId,testId:observedInput.testId,observedSourceRef:observedInput.sourceRef,
    modelId:modeledInput.modelId,modelRevision:modeledInput.modelRevision,comparisonState:'restrained',
    gaugePairs:gauges.map(({gaugeId,nodeId},i)=>({observedGaugeId:gaugeIds[i],modeledGaugeId:gaugeId,nodeId,evidenceRef:`synthetic gauge ${i+1}`})),
    bearingPairs:['L','E'].map((modeledNodeId,i)=>({observedBearingId:bearingIds[i],modeledNodeId,evidenceRef:`synthetic bearing ${i+1}`})),
    stepPairs:authoredStepIds.map((stepId,i)=>({stepId,caseId:modeledCaseIds[i],evidenceRef:`synthetic step ${i+1}`})),
    maxReactionDifferenceLb:2,
  };
  return structuredClone({modeledInput,observedInput,scope});
}
const near=(actual,expected)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<1e-7,
  `${actual} does not match independent comparison ${expected}`);

test('three explicitly paired synthetic steps preserve signed gauge and individual bearing residuals',()=>{
  const input=fixture();
  const frozen=structuredClone(input);
  const out=compare(input);
  assert.equal(out.status,'PRELIMINARY_CORRESPONDENCE_ONLY');
  assert.deepEqual(JSON.parse(JSON.stringify(out.scope)),input.scope);
  assert.equal(out.fabricationAuthorized,false);
  assert.deepEqual(input,frozen,'comparison must not mutate either source, gauges, components, or authored factors');
  assert.deepEqual(out.rows.map(({stepId,caseId})=>({stepId,caseId})),authoredStepIds.map((stepId,i)=>({stepId,caseId:modeledCaseIds[i]})));
  for(const row of out.rows){
    row.gaugeResidualIn.forEach((value,i)=>near(value,-biasGaugeIn[i]));
    near(row.meanGaugeResidualIn,-biasGaugeIn.reduce((acc,value)=>acc+value,0)/3);
    row.bearingResidualLb.forEach((value,i)=>near(value,-biasBearingLb[i]));
    near(row.totalReactionResidualLb,-.25);
  }
  assert.equal(Object.hasOwn(out,'fit'),false);
});

test('one bearing beyond the declared tolerance holds the comparison even if total reaction stays identical',()=>{
  const input=fixture();
  const pair=input.observedInput.samples[1].verticalBearingReactionLb;
  near(pair[0]+pair[1],200.25);
  pair[0]+=10;
  pair[1]-=10;
  near(pair[0]+pair[1],200.25);
  assert.throws(()=>compare(input),/bearing|reaction|tolerance/i);
});
