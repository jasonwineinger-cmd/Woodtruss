import assert from 'node:assert/strict';
import test from 'node:test';
import { generateMonoTopology } from '../dist/geometry/src/mono.js';
import { studyAuthoredMonoElasticFrameDisplacements } from '../dist/analysis/src/mono-authored-elastic-frame-displacements.js';

const roof={family:'mono',spanFt:50,pitchRisePer12:3};
const memberAssignments=generateMonoTopology(roof).members.map(({id,start,end})=>({
 memberId:id,startNodeId:start,endNodeId:end,areaIn2:5.25,secondMomentIn4:5.359375,
 elasticModulusPsi:1e6,releaseStartRotation:false,releaseEndRotation:false,
}));
const supports=[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},{nodeId:'E',fixX:false,fixY:true,fixRotation:false}];
const target={memberId:'web-T1-B1',startNodeId:'T1',endNodeId:'B1',stationsIn:[37.5,0,12]};
const input={roof,memberAssignments,supports,modelId:'mono-fixture',modelRevision:'r1',
 sources:[{caseId:'force',sourceRef:'fixture-source',loads:[{nodeId:'T2',fxLb:0,fyLb:-90,momentLbIn:0}]}],
 combinations:[{caseId:'combined',sourceRef:'fixture-combo',terms:[{caseId:'force',factor:1}]}],
 observedNodeIds:['E','T2'],memberStations:[target]};
const preview=(updates)=>studyAuthoredMonoElasticFrameDisplacements({...input,...updates});

test('reviews explicit modeled nodes and directed-member stations in authored order at the full 50-ft mono limit',()=>{
 const result=preview();
 assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(result.fabricationAuthorized,false);
 const [row]=result.cases;
 assert.equal(row.caseId,'combined');
 assert.deepEqual(row.nodalDisplacements.map(y=>y.nodeId),['E','T2']);
 assert.deepEqual(row.memberDisplacements.map(x=>[x.memberId,x.startNodeId,x.endNodeId]),
  [[target.memberId,target.startNodeId,target.endNodeId]]);
 assert.deepEqual(row.memberDisplacements[0].samples.map(sample=>sample.stationIn),target.stationsIn);
});

test('holds duplicate, missing or foreign selections and stations outside exact directed geometry',()=>{
 for(const bad of [
  {observedNodeIds:[]},{observedNodeIds:['E','E']},{observedNodeIds:['Q1']},{observedNodeIds:['web-T1-B1@12']},
  {memberStations:[]},{memberStations:[target,target]},
  {memberStations:[{...target,memberId:'T1'}]},
  {memberStations:[{...target,startNodeId:'B1',endNodeId:'T1'}]},
  {memberStations:[{...target,stationsIn:[0,0]}]},
  {memberStations:[{...target,stationsIn:[37.50001]}]},
  {memberStations:[{...target,stationsIn:[-0.01]}]},
  {memberStations:[{...target,stationsIn:['12']}]},
  {memberStations:[{...target,stationsIn:[NaN]}]},
  {memberStations:[{...target,stationsIn:new Array(1)}]},
  {memberStations:[{...target,transverseIn:3}]},
 ]){
  assert.throws(()=>preview(bad));
 }
});

test('rejects unsupported roof and caller-supplied result, coordinate or authority substitutions',()=>{
 for(const bad of [
  {roof:{...roof,spanFt:50.001}},{roof:{...roof,bottomPitchRisePer12:1}},{roof:{...roof,overhangIn:1}},
  {displacements:{T2:{uyIn:3}}},{memberSectionDisplacements:{}},{originNodeId:'L'},
  {frame:{nodes:[{id:'T2',xIn:300,yIn:75}]}},{fabricationAuthorized:true},
  {sources:[{...input.sources[0],nodalDisplacements:[{nodeId:'T2',uyIn:0}]}]},
 ]){
  assert.throws(()=>preview(bad));
 }
});
