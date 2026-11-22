import assert from 'node:assert/strict';
import test from 'node:test';
import { generateScissorTopology } from '../dist/geometry/src/scissor.js';
import { analyzePreliminaryScissorExplicit } from '../dist/analysis/src/scissor-explicit-analysis.js';
import { buildScissorAuthoredElasticFrameModel } from '../dist/analysis/src/scissor-authored-elastic-frame-model.js';
import { studyAuthoredScissorElasticFrameReactions } from '../dist/analysis/src/scissor-authored-elastic-frame-study.js';

const roof={family:'scissor',spanFt:50,pitchRisePer12:6,bottomPitchRisePer12:3};
const positions=[['L',0,0],['Q1',150,75],['R',300,150],['Q3',450,75],['E',600,0],
 ['B1',150,37.5],['B2',300,75],['B3',450,37.5]];
const graph=[
 ['top','L','Q1'],['top','Q1','R'],['top','R','Q3'],['top','Q3','E'],
 ['bottom','L','B1'],['bottom','B1','B2'],['bottom','B2','B3'],['bottom','B3','E'],
 ['web','Q1','B1'],['web','Q1','B2'],['web','R','B2'],['web','Q3','B2'],['web','Q3','B3'],
].map(([kind,start,end])=>[`${kind}-${start}-${end}`,start,end]);
const props={areaIn2:5.25,secondMomentIn4:5.359375,elasticModulusPsi:1e6};
const memberAssignments=graph.map(([memberId,startNodeId,endNodeId])=>({
 memberId,startNodeId,endNodeId,...props,releaseStartRotation:false,releaseEndRotation:false,
}));
const supports=[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},{nodeId:'E',fixX:false,fixY:true,fixRotation:false}];
const authored={roof,memberAssignments,supports};
const studyInput={...authored,modelId:'scissor-fixture',modelRevision:'r1',originNodeId:'L',
 sources:[{caseId:'force',sourceRef:'fixture-source',loads:[{nodeId:'R',fxLb:0,fyLb:-90,momentLbIn:0}]}],
 combinations:[{caseId:'combined',sourceRef:'fixture-combination',terms:[{caseId:'force',factor:1}]}]};

test('the exact level 50-ft elastic frame uses the same ordered centerline graph as pin-joint scissor',()=>{
 const schematic=generateScissorTopology(roof);
 const legacy=analyzePreliminaryScissorExplicit({roof,areaIn2:props.areaIn2,elasticModulusPsi:props.elasticModulusPsi,
  loadCase:{id:'force',description:'fixture point action',jointLoads:[{nodeId:'R',fyLb:-90}]}});
 const frame=buildScissorAuthoredElasticFrameModel({...authored,memberAssignments:[...memberAssignments].reverse()});
 assert.deepEqual(schematic.joints.map(({id,position})=>[id,position.x,position.y]),positions);
 assert.deepEqual(legacy.model.nodes.map(({id,x,y})=>[id,x,y]),positions);
 assert.deepEqual(frame.nodes.map(({id,xIn,yIn})=>[id,xIn,yIn]),positions);
 assert.deepEqual(schematic.members.map(({id,start,end})=>[id,start,end]),graph);
 assert.deepEqual(legacy.model.bars.map(({id,a,b})=>[id,a,b]),graph);
 assert.deepEqual(frame.members.map(({id,startNodeId,endNodeId})=>[id,startNodeId,endNodeId]),graph);
 for(const member of frame.members){
  assert.deepEqual([member.areaIn2,member.secondMomentIn4,member.elasticModulusPsi],
   [props.areaIn2,props.secondMomentIn4,props.elasticModulusPsi]);
 }
 assert.equal(studyAuthoredScissorElasticFrameReactions(studyInput).fabricationAuthorized,false);
});

test('directed members, narrowly separated pitches, and unsupported roof geometry cannot be substituted',()=>{
 const reversed={...memberAssignments[0],startNodeId:'Q1',endNodeId:'L'};
 assert.throws(()=>buildScissorAuthoredElasticFrameModel({...authored,memberAssignments:[reversed,...memberAssignments.slice(1)]}),/directed/u);
 for(const override of [{heelHeightIn:0.25},{overhangIn:0.25}]){
  assert.throws(()=>buildScissorAuthoredElasticFrameModel({...authored,roof:{...roof,...override}}),/heel|overhang/iu);
 }
 const collapsed={...roof,pitchRisePer12:8,bottomPitchRisePer12:7.999999999999999};
 const geometry=generateScissorTopology(collapsed);
 const point=id=>geometry.joints.find(joint=>joint.id===id).position;
 assert.deepEqual(point('Q1'),point('B1'));
 assert.throws(()=>studyAuthoredScissorElasticFrameReactions({...studyInput,roof:collapsed}),/zero.length|member.*length/iu);
});

test('elastic reactions cannot accept replacement coordinates or a stress selector',()=>{
 for(const extra of [{frame:{nodes:[{id:'L',xIn:100}] }},
  {members:[{memberId:graph[0][0],rectangle:{actualWidthIn:1.5,actualDepthIn:3.5}}]}]){
  assert.throws(()=>studyAuthoredScissorElasticFrameReactions({...studyInput,...extra}),/exact authored scissor frame/iu);
 }
});
