import assert from 'node:assert/strict';
import test from 'node:test';
import {compareAuthoredScissorElasticFrameReleases as compare} from '../dist/analysis/src/scissor-authored-release-comparison.js';

const incidence=[
  ['top','L','Q1'],['top','Q1','R'],['top','R','Q3'],['top','Q3','E'],
  ['bottom','L','B1'],['bottom','B1','B2'],['bottom','B2','B3'],['bottom','B3','E'],
  ['web','Q1','B1'],['web','Q1','B2'],['web','R','B2'],['web','Q3','B2'],['web','Q3','B3'],
];
const selected='top-L-Q1';
const override={memberId:selected,startNodeId:'L',endNodeId:'Q1',
  releaseStartRotation:false,releaseEndRotation:true};
const fixture={
  modelId:'synthetic-scissor-release-balance',modelRevision:'r1',originNodeId:'L',
  roof:{family:'scissor',spanFt:20,pitchRisePer12:6,bottomPitchRisePer12:3},
  memberAssignments:incidence.map(([role,startNodeId,endNodeId])=>({
    memberId:`${role}-${startNodeId}-${endNodeId}`,startNodeId,endNodeId,areaIn2:8,
    secondMomentIn4:32/3,elasticModulusPsi:1.2e6,releaseStartRotation:false,releaseEndRotation:false,
  })),
  supports:[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},
    {nodeId:'E',fixX:false,fixY:true,fixRotation:false}],
  sources:[{caseId:'declared',sourceRef:'Synthetic loads only',
    loads:[{nodeId:'R',fxLb:30,fyLb:-50,momentLbIn:12}],
    memberLoads:[{memberId:selected,basis:'horizontal-projection',qxLbPerIn:1,qyLbPerIn:-2}]}],
  combinations:[{caseId:'signed',sourceRef:'Hand-authored single-factor case',
    terms:[{caseId:'declared',factor:1}]}],
  releaseVariants:[{variantId:'rigid-baseline',sourceRef:'Explicit all-rigid idealization',overrides:[]},
    {variantId:'q1-release',sourceRef:'Explicit release for comparison only',overrides:[override]}],
  memberIds:[selected],
};
function near(actual,expected) {
  assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<1e-7,
    `${actual} does not match independent free body ${expected}`);
}
function vector(actual,[x,y,m]) {
  near(actual.fxLb,x);near(actual.fyLb,y);near(actual.momentLbIn,m);
}

test('a scoped scissor roof release changes member bending and motion, not determinate reactions',()=>{
  const result=compare(structuredClone(fixture));
  assert.equal(result.family,'scissor');
  assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(result.variants.map(({variantId,sourceRef,overrides})=>({variantId,sourceRef,overrides})),fixture.releaseVariants);
  const cases=result.variants.map(variant=>{
    assert.equal(variant.cases.length,1);
    const [row]=variant.cases;
    assert.equal(row.caseId,'signed');
    assert.deepEqual(Object.keys(row.memberEndActions),[selected]);
    assert.deepEqual(Object.keys(row.memberDeflectionExtrema),[selected]);
    return row;
  });
  const [rigid,released]=cases.map(row=>row.memberEndActions[selected]);
  assert.equal(rigid.startNodeId,'L');
  assert.equal(rigid.endNodeId,'Q1');
  assert.deepEqual(rigid.releasedRotationIndices,[]);
  assert.deepEqual(released.releasedRotationIndices,[5]);
  assert.ok(Math.abs(rigid.localEndActions[5])>1);
  near(released.localEndActions[5],0);
  near(released.releasedMomentResiduals[0].momentLbIn,0);
  assert.notEqual(released.localDisplacements[5],rigid.localDisplacements[5]);

  for (const [i,row] of cases.entries()) {
    // R(120,60) contributes (30,-50) and 120(-50)-60(30)+12 CCW.
    // Projected q across dx=60 contributes (60,-120) at (30,15).
    // With bearing separation of 240, R_Ey=12288/240=51.2 and
    // R_Ly=170-51.2; neither support restrains rotation.
    assert.equal(row.physicalResultant.originNodeId,'L');
    vector(row.physicalResultant.applied,[90,-170,-12288]);
    assert.deepEqual(row.physicalResultant.supportRows.map(r=>r.nodeId),['L','E']);
    vector(row.physicalResultant.supportRows[0],[-90,118.8,0]);
    vector(row.physicalResultant.supportRows[1],[0,51.2,12288]);
    vector(row.physicalResultant.residual,[0,0,0]);

    // Independent free body of the actual top piece: transform its physical
    // (60,-120) UDL with tangent (2,1)/sqrt(5), normal (-1,2)/sqrt(5).
    const [n0,v0,m0,n1,v1,m1]=(i===0?rigid:released).localEndActions;
    const length=30*Math.sqrt(5), loadedTransverse=-300/Math.sqrt(5);
    near(n0+n1,0);
    near(v0+v1,-loadedTransverse);
    near(m0+m1+length*v1,-.5*length*loadedTransverse);
  }
  const [baseline,variant]=cases.map(row=>row.memberDeflectionExtrema[selected].chordRelativeTransverseIn);
  assert.ok([baseline.min.valueIn,baseline.max.valueIn,variant.min.valueIn,variant.max.valueIn].every(Number.isFinite));
  assert.ok(Math.max(Math.abs(baseline.min.valueIn-variant.min.valueIn),
    Math.abs(baseline.max.valueIn-variant.max.valueIn))>1e-5);
});

test('releasing the reversed incidence or duplicating the rigid baseline is withheld',()=>{
  const other=structuredClone(fixture);
  const row=other.releaseVariants[1].overrides[0];
  [row.startNodeId,row.endNodeId]=[row.endNodeId,row.startNodeId];
  assert.throws(()=>compare(other),/member|direction|end/i);
  const duplicate=structuredClone(fixture);
  duplicate.releaseVariants[1].overrides=[];
  assert.throws(()=>compare(duplicate),/duplicate|distinct|same/i);
});
