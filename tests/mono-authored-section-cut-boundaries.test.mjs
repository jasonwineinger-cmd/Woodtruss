import assert from 'node:assert/strict';
import test from 'node:test';
import { generateMonoTopology } from '../dist/geometry/src/mono.js';
import { studyAuthoredMonoElasticFrameSectionCuts } from '../dist/analysis/src/mono-authored-elastic-frame-section-cuts.js';

const roof={family:'mono',spanFt:50,pitchRisePer12:3};
const memberAssignments=generateMonoTopology(roof).members.map(({id,start,end})=>({
 memberId:id,startNodeId:start,endNodeId:end,areaIn2:5.25,secondMomentIn4:5.359375,
 elasticModulusPsi:1e6,releaseStartRotation:false,releaseEndRotation:false,
}));
const supports=[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},{nodeId:'E',fixX:false,fixY:true,fixRotation:false}];
const member={memberId:'bottom-L-B1',startNodeId:'L',endNodeId:'B1'};
const point={memberId:member.memberId,stationIn:24,fxLb:0,fyLb:-25};
const sources=[
 {caseId:'base',sourceRef:'fixture-base',loads:[{nodeId:'T2',fxLb:0,fyLb:-90,momentLbIn:0}],memberPointLoads:[point]},
 {caseId:'opposite',sourceRef:'fixture-opposite',loads:[],memberPointLoads:[{...point,fyLb:25}]},
];
const combinations=[
 {caseId:'with-point',sourceRef:'fixture-first',terms:[{caseId:'base',factor:1}]},
 {caseId:'cancelled',sourceRef:'fixture-second',terms:[{caseId:'base',factor:1},{caseId:'opposite',factor:1}]},
];
const cases=[
 {caseId:'with-point',memberCuts:[{...member,cuts:[{stationIn:24,side:'right'},{stationIn:24,side:'left'}]}]},
 {caseId:'cancelled',memberCuts:[{...member,cuts:[{stationIn:24,side:'left'},{stationIn:24,side:'right'},{stationIn:0,side:'continuous'},{stationIn:150,side:'continuous'}]}]},
];
const request={roof,memberAssignments,supports,modelId:'mono-fixture',modelRevision:'r1',sources,combinations,caseCuts:cases};
const review=updates=>studyAuthoredMonoElasticFrameSectionCuts({...request,...updates});
const withCuts=(cuts,at=0)=>cases.map((entry,i)=>i===at?{...entry,memberCuts:[{...member,cuts}]}:entry);

test('retains both authored point sides after exact cancellation and gives equal signed resultants',()=>{
 const result=review();
 assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(result.fabricationAuthorized,false);
 assert.deepEqual(result.cases.map(row=>row.caseId),['with-point','cancelled']);
 const [active,quiet]=result.cases.map(row=>row.memberCuts[0]);
 assert.deepEqual([active.memberId,active.startNodeId,active.endNodeId],[member.memberId,member.startNodeId,member.endNodeId]);
 assert.deepEqual(active.cuts.map(({stationIn,side})=>[stationIn,side]),[[24,'right'],[24,'left']]);
 assert.deepEqual(quiet.cuts.map(({stationIn,side})=>[stationIn,side]),[[24,'left'],[24,'right'],[0,'continuous'],[150,'continuous']]);
 const [right,left]=active.cuts;
 const [quietLeft,quietRight]=quiet.cuts;
 for(const component of ['axialLb','shearLb','momentLbIn']) assert.equal(quietLeft[component],quietRight[component]);
 assert.ok(Math.abs(right.shearLb-left.shearLb-25)<1e-8);
 assert.ok(Math.abs(right.momentLbIn-left.momentLbIn)<1e-8);
});

test('holds mismatched combination order or scope and invalid cut-side proof',()=>{
 for(const caseCuts of [
  cases.slice(0,1),[...cases].reverse(),[cases[0],cases[0]],
  [cases[0],{...cases[1],caseId:'unknown'}],
  withCuts([{stationIn:24,side:'continuous'}]),
  withCuts([{stationIn:24.000001,side:'left'}]),
  withCuts([{stationIn:24,side:'continuous'}],1),
  withCuts([{stationIn:0,side:'left'}]),
  withCuts([{stationIn:150,side:'right'}]),
 ]){
  assert.throws(()=>review({caseCuts}));
 }
});

test('rejects duplicate, out-of-range and wrong-directed cuts and any supplied results or release',()=>{
 const first=cases[0].memberCuts[0];
 for(const caseCuts of [
  withCuts([{stationIn:24,side:'left'},{stationIn:24,side:'left'}]),
  withCuts([{stationIn:-0.001,side:'continuous'}]),withCuts([{stationIn:150.001,side:'continuous'}]),
  withCuts([{stationIn:24,side:'left',momentLbIn:10}]),
  [{...cases[0],memberCuts:[{...first,startNodeId:'B1',endNodeId:'L'}]},cases[1]],
  [{...cases[0],memberCuts:[first,first]},cases[1]],
 ]){
  assert.throws(()=>review({caseCuts}));
 }
 for(const bad of [
  {roof:{...roof,spanFt:50.001}}, {roof:{...roof,overhangIn:1}},
  {memberSectionDemand:{}}, {originNodeId:'L'}, {fabricationAuthorized:true},
 ]){
  assert.throws(()=>review(bad));
 }
});
