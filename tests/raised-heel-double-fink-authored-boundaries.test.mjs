import assert from 'node:assert/strict';
import test from 'node:test';
import {generateRaisedHeelDoubleFinkTopology} from '../dist/geometry/src/raised-heel-double-fink-topology.js';
import {buildRaisedHeelDoubleFinkAuthoredElasticFrameModel as build}
  from '../dist/analysis/src/raised-heel-double-fink-authored-elastic-frame-model.js';
import {studyAuthoredRaisedHeelDoubleFinkElasticFrameReactions as study}
  from '../dist/analysis/src/raised-heel-double-fink-authored-elastic-frame-study.js';

const roof={family:'common',spanFt:50,pitchRisePer12:4,heelHeightIn:48};
const topo=generateRaisedHeelDoubleFinkTopology(roof);
const memberAssignments=topo.members.map(({id,start,end})=>({memberId:id,startNodeId:start,endNodeId:end,
  areaIn2:5,secondMomentIn4:14,elasticModulusPsi:1_000_000,releaseStartRotation:false,releaseEndRotation:false}));
const supports=[{nodeId:'E',fixX:false,fixY:true,fixRotation:false},{nodeId:'L',fixX:true,fixY:true,fixRotation:false}];
const model={roof,memberAssignments,supports};
const request={...model,modelId:'double-fink-synthetic',modelRevision:'r1',originNodeId:'L',
  sources:[{caseId:'peak-load',sourceRef:'fixture load only',loads:[{nodeId:'T4',fxLb:0,fyLb:-100,momentLbIn:0}]}],
  combinations:[{caseId:'combined',sourceRef:'fixture combination only',terms:[{caseId:'peak-load',factor:1}]}]};

test('selects the raised-heel eight-panel topology at 50 ft, with actual bearing and heel identities',()=>{
  const frame=build({...model,roof:{...roof,overhangIn:0},memberAssignments:[...memberAssignments].reverse()});
  const spanIds=['L','E','HL','HE','T1','B1','T4','B4','T7','B7'];
  assert.deepEqual(spanIds.map(id=>{
    const node=frame.nodes.find(row=>row.id===id);
    return [node.id,node.xIn,node.yIn];
  }),[['L',0,0],['E',600,0],['HL',0,48],['HE',600,48],['T1',75,73],['B1',75,0],['T4',300,148],['B4',300,0],['T7',525,73],['B7',525,0]]);
  assert.equal(frame.nodes.length,18);
  assert.equal(frame.members.length,33);
  assert.deepEqual(frame.members.filter(row=>['web-L-HL','web-HL-B1','web-B7-HE','web-HE-E'].includes(row.id))
    .map(({id,startNodeId,endNodeId})=>[id,startNodeId,endNodeId]),[
    ['web-L-HL','L','HL'],['web-HL-B1','HL','B1'],['web-B7-HE','B7','HE'],['web-HE-E','HE','E'],
  ]);
  assert.deepEqual(frame.members.map(({id,startNodeId,endNodeId})=>[id,startNodeId,endNodeId]),
    topo.members.map(({id,start,end})=>[id,start,end]));
  assert.deepEqual(frame.supports,supports);
  const lower=build({...model,roof:{...roof,spanFt:8,heelHeightIn:1}});
  assert.equal(lower.nodes.find(node=>node.id==='E').xIn,96);
});

test('holds roof alternatives, stale or reversed directed members, and joint-as-bearing substitutions',()=>{
  for(const change of [{spanFt:50.0001},{spanFt:7.999},{family:'mono'},{heelHeightIn:0},{heelHeightIn:48.001},{overhangIn:1},
    {spanFt:Infinity},{heelHeightIn:NaN},{pitchRisePer12:Infinity},
    {bottomPitchRisePer12:0},{pitchRisePer12:0}])
    assert.throws(()=>build({...model,roof:{...roof,...change}}));
  const [first,...rest]=memberAssignments;
  for(const bad of [rest,[rest[0],...rest],
    [{...first,startNodeId:first.endNodeId,endNodeId:first.startNodeId},...rest],
    [{...first,memberId:'top-L-T1',startNodeId:'L'},...rest],
    [{...first,releaseStartRotation:undefined},...rest]])
    assert.throws(()=>build({...model,memberAssignments:bad}));
  for(const staleWeb of [
    {memberId:'web-B1-HL',startNodeId:'B1',endNodeId:'HL'},
    {memberId:'web-HL-B1',startNodeId:'L',endNodeId:'B1'},
    {memberId:'web-HL-B2',startNodeId:'HL',endNodeId:'B2'},
  ]) assert.throws(()=>build({...model,memberAssignments:memberAssignments.map(row=>
    row.memberId==='web-HL-B1'?{...row,...staleWeb}:row)}));
  for(const bad of [[supports[0]], [{...supports[0],nodeId:'HE'},supports[1]],
    [supports[0],{...supports[1],nodeId:'E'}]])
    assert.throws(()=>build({...model,supports:bad}),/support|bearing/iu);
});

test('runs only a preliminary raised-heel double-Fink study and holds invalid targets or singular restraints',()=>{
  const out=study(request);
  assert.equal(out.family,'common');
  assert.equal(out.subtype,'symmetric-raised-heel-double-fink-reference');
  assert.equal(out.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(out.fabricationAuthorized,false);
  const foreign={caseId:'unused',sourceRef:'fixture unused load only',loads:[{nodeId:'Q1',fxLb:0,fyLb:-10,momentLbIn:0}]};
  assert.throws(()=>study({...request,sources:[...request.sources,foreign]}),/unknown|not modeled|not present/iu);
  assert.throws(()=>study({...request,supports:supports.map(row=>({...row,fixX:false}))}),
    /singular|unstable|restraint|ill-conditioned/iu);
  assert.throws(()=>study({...request,machineReleaseAuthorized:true}));
});
