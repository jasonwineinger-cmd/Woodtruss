import assert from 'node:assert/strict';
import test from 'node:test';
import { generateMonoTopology } from '../dist/geometry/src/mono.js';
import { buildMonoAuthoredElasticFrameModel } from '../dist/analysis/src/mono-authored-elastic-frame-model.js';
import { studyAuthoredMonoElasticFrameReactions } from '../dist/analysis/src/mono-authored-elastic-frame-study.js';

const roof={family:'mono',spanFt:50,pitchRisePer12:3};
const positions=[['L',0,0],['T1',150,37.5],['B1',150,0],['T2',300,75],['B2',300,0],
 ['T3',450,112.5],['B3',450,0],['T4',600,150],['E',600,0]];
const graph=[
 ['top','L','T1'],['bottom','L','B1'],['web','T1','B1'],
 ['top','T1','T2'],['bottom','B1','B2'],['web','T2','B2'],['web','T1','B2'],
 ['top','T2','T3'],['bottom','B2','B3'],['web','T3','B3'],['web','T2','B3'],
 ['top','T3','T4'],['bottom','B3','E'],['web','T4','E'],['web','T3','E'],
].map(([kind,start,end])=>[`${kind}-${start}-${end}`,start,end]);
const props={areaIn2:5.25,secondMomentIn4:5.359375,elasticModulusPsi:1e6};
const memberAssignments=graph.map(([memberId,startNodeId,endNodeId],index)=>({
 memberId,startNodeId,endNodeId,...props,releaseStartRotation:false,releaseEndRotation:index===0,
 ...(index===0?{shear:{shearModulusPsi:70e3,effectiveShearAreaIn2:3}}:{}),
}));
const supports=[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},{nodeId:'E',fixX:false,fixY:true,fixRotation:false}];
const model={roof,memberAssignments,supports};
const study={...model,modelId:'mono-fixture',modelRevision:'r1',originNodeId:'L',
 sources:[{caseId:'force',sourceRef:'fixture-source',loads:[{nodeId:'T2',fxLb:0,fyLb:-90,momentLbIn:0}]}],
 combinations:[{caseId:'combined',sourceRef:'fixture-combo',terms:[{caseId:'force',factor:1}]}]};

test('binds exact authored directed inputs at the full level-bearing 50-ft mono limit',()=>{
 const geometry=generateMonoTopology(roof);
 const frame=buildMonoAuthoredElasticFrameModel({...model,memberAssignments:[...memberAssignments].reverse()});
 assert.deepEqual(geometry.joints.map(({id,position})=>[id,position.x,position.y]),positions);
 assert.deepEqual(frame.nodes.map(({id,xIn,yIn})=>[id,xIn,yIn]),positions);
 assert.deepEqual(geometry.members.map(({id,start,end})=>[id,start,end]),graph);
 assert.deepEqual(frame.members.map(({id,startNodeId,endNodeId})=>[id,startNodeId,endNodeId]),graph);
 const {memberId,...explicit}=memberAssignments[0];
 assert.deepEqual(JSON.parse(JSON.stringify(frame.members[0])),{id:memberId,...explicit});
 assert.deepEqual(JSON.parse(JSON.stringify(frame.supports)),supports);
 const result=studyAuthoredMonoElasticFrameReactions(study);
 assert.equal(result.family,'mono');
 assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(result.fabricationAuthorized,false);
});

test('does not infer a roof variant, member direction, section property, or support',()=>{
 for(const change of [{spanFt:50.001},{family:'scissor'},{heelHeightIn:1},{overhangIn:1},{bottomPitchRisePer12:1}]){
  assert.throws(()=>buildMonoAuthoredElasticFrameModel({...model,roof:{...roof,...change}}),/mono|span|roof/iu);
 }
 const [first,...others]=memberAssignments;
 for(const bad of [
  {...first,startNodeId:first.endNodeId,endNodeId:first.startNodeId},
  {...first,memberId:'unknown'}, {...first,secondMomentIn4:undefined},
  {...first,releaseEndRotation:'true'}, {...first,shear:{shearModulusPsi:70e3}},
  {...first,capacityLb:123},
 ]){
  assert.throws(()=>buildMonoAuthoredElasticFrameModel({...model,memberAssignments:[bad,...others]}));
 }
 const [,second]=supports;
 for(const invalid of [[supports[0]], [supports[0],{...second,nodeId:'T4'}], [supports[0],{...second,nodeId:'L'}]]){
  assert.throws(()=>buildMonoAuthoredElasticFrameModel({...model,supports:invalid}),/support|bearing/iu);
 }
});

test('a mono reaction review rejects foreign paths and assembly or capacity substitutions',()=>{
 for(const extra of [{originNodeId:'Q1'},
  {sources:[{...study.sources[0],loads:[{nodeId:'Q1',fxLb:0,fyLb:-90,momentLbIn:0}]}]},
  {frame:{nodes:positions}}, {machineReleaseApproved:true},
 ]){
  assert.throws(()=>studyAuthoredMonoElasticFrameReactions({...study,...extra}));
 }
});
