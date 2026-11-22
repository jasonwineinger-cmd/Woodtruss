import assert from 'node:assert/strict';
import test from 'node:test';
import {captureAuthoredElasticFrameCombinationReview as capture} from '../dist/analysis/src/elastic-frame-authored-combination-receipt.js';
import {replayAuthoredElasticFrameCombinationReview as replay} from '../dist/analysis/src/elastic-frame-authored-combination-replay.js';

const source=(caseId, sourceRef, qxLbPerIn, qyLbPerIn, fxLb, fyLb)=>({
  caseId, sourceRef, loads:[],
  memberLoads:[{memberId:'span',basis:'member-length',qxLbPerIn,qyLbPerIn}],
  memberPointLoads:[{memberId:'span',stationIn:3,fxLb,fyLb}],
});
const fixture={
  modelId:'independent-axial-bending-oracle',modelRevision:'test-r1',
  frame:{
    nodes:[{id:'pin',xIn:0,yIn:0},{id:'roller',xIn:12,yIn:0}],
    members:[{id:'span',startNodeId:'pin',endNodeId:'roller',areaIn2:8,
      secondMomentIn4:32/3,elasticModulusPsi:1.4e6}],
    supports:[{nodeId:'pin',fixX:true,fixY:true,fixRotation:false},
      {nodeId:'roller',fixX:false,fixY:true,fixRotation:false}],
  },
  // Inputs intentionally not in alphabetic order. Factors are authored, not code defaults.
  sources:[source('source-b','Hand source B',1,-2,4,-8),source('source-a','Hand source A',1,-2,4,-8)],
  combinations:[
    {caseId:'down',sourceRef:'Hand case down',terms:[{caseId:'source-a',factor:2},{caseId:'source-b',factor:-1}]},
    {caseId:'up',sourceRef:'Hand case up',terms:[{caseId:'source-b',factor:1},{caseId:'source-a',factor:-2}]},
  ],
  members:[{memberId:'span',rectangle:{actualWidthIn:2,actualDepthIn:4}}],
};
const near=(actual,expected)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<1e-8,
  `${actual} does not match independent result ${expected}`);

test('a serialized authored combination replays exact signs, authored order and independent co-located stress',()=>{
  const authored=structuredClone(fixture);
  const captured=capture(authored);
  authored.sources[0].sourceRef='Caller mutated its source';
  const stored=JSON.parse(JSON.stringify(captured));
  assert.equal(stored.kind,'authored-elastic-frame-combination-review/v1');
  assert.equal(stored.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(stored.manufacturingApproved,false);
  assert.deepEqual(stored.input,fixture);
  assert.equal(Object.hasOwn(stored,'caseResults'),false,'receipt is not cached mechanics output');
  const fresh=replay(stored,structuredClone(fixture));
  assert.equal(fresh.modelId,fixture.modelId);
  assert.equal(fresh.modelRevision,fixture.modelRevision);
  assert.equal(fresh.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(fresh.fabricationAuthorized,false);
  assert.equal(fresh.manufacturingApproved,false);
  assert.deepEqual(fresh.caseResults.map(x=>x.caseId),['down','up']);
  assert.deepEqual(fresh.combinationProvenance,[
    {caseId:'down',sourceRef:'Hand case down',terms:[
      {caseId:'source-a',sourceRef:'Hand source A',factor:2},{caseId:'source-b',sourceRef:'Hand source B',factor:-1}]},
    {caseId:'up',sourceRef:'Hand case up',terms:[
      {caseId:'source-b',sourceRef:'Hand source B',factor:1},{caseId:'source-a',sourceRef:'Hand source A',factor:-2}]},
  ]);

  // For q=(+1,-2) and point (+4,-8) at x=3, the transverse force is
  // 24+8 lb. Moments about the left bearing give right reaction
  // (24*6+8*3)/12=14 lb (left 18 lb), axial reaction left -16 lb.
  // Right-hand sliver, x>3: N=12-x, V=2x-10, M=10x-x²+24.
  // Fiber derivatives vanish at V=+2/3 (upper), -2/3 (lower), not peak M at x=5.
  const down=fresh.caseResults[0].memberRectangularStressExtrema.span;
  for (const [cut, expected] of [
    [down.positiveDepth.min,[16/3,20/3,2/3,440/9,-25/3]],
    [down.negativeDepth.max,[14/3,22/3,-2/3,440/9,121/12]],
  ]) {
    assert.equal(cut.side,'continuous');
    const actual=[cut.stationIn,cut.axialLb,cut.shearLb,cut.momentLbIn,cut.normalStressPsi];
    actual.forEach((value,i)=>near(value,expected[i]));
  }
  const upper=fresh.memberEnvelope.span.positiveDepth;
  assert.equal(upper.min.caseId,'down');
  assert.equal(upper.max.caseId,'up');
  near(upper.max.stationIn,16/3);
  near(upper.max.normalStressPsi,25/3);
  near(upper.max.momentLbIn,-440/9);
});

test('replay fails if the fresh physical point lever arm differs from the reviewed one',()=>{
  const stored=JSON.parse(JSON.stringify(capture(structuredClone(fixture))));
  const changed=structuredClone(fixture);
  // Shift both points consistently, so the changed physics is itself solvable.
  // A genuine replay must refuse it rather than replay against a different lever arm.
  changed.sources.forEach(c=>{ c.memberPointLoads[0].stationIn=4; });
  assert.throws(()=>replay(stored,changed));
});
