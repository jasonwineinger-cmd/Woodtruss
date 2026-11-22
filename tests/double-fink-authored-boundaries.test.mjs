import assert from 'node:assert/strict';
import test from 'node:test';
import {generateDoubleFinkTopology} from '../dist/geometry/src/double-fink-topology.js';
import {buildDoubleFinkAuthoredElasticFrameModel as build}
  from '../dist/analysis/src/double-fink-authored-elastic-frame-model.js';
import {studyAuthoredDoubleFinkElasticFrameReactions as study}
  from '../dist/analysis/src/double-fink-authored-elastic-frame-study.js';

const roof={family:'common',spanFt:50,pitchRisePer12:4};
const topo=generateDoubleFinkTopology(roof);
const memberAssignments=topo.members.map(({id,start,end})=>({memberId:id,startNodeId:start,endNodeId:end,
  areaIn2:5,secondMomentIn4:14,elasticModulusPsi:1_000_000,releaseStartRotation:false,releaseEndRotation:false}));
const supports=[{nodeId:'E',fixX:false,fixY:true,fixRotation:false},{nodeId:'L',fixX:true,fixY:true,fixRotation:false}];
const model={roof,memberAssignments,supports};
const request={...model,modelId:'double-fink-synthetic',modelRevision:'r1',originNodeId:'L',
  sources:[{caseId:'peak-load',sourceRef:'fixture load only',loads:[{nodeId:'T4',fxLb:0,fyLb:-100,momentLbIn:0}]}],
  combinations:[{caseId:'combined',sourceRef:'fixture combination only',terms:[{caseId:'peak-load',factor:1}]}]};

test('selects the ordinary eight-panel directed topology at 50 ft, not a raised-heel or generic frame',()=>{
  const frame=build({...model,roof:{...roof,overhangIn:0,heelHeightIn:0},memberAssignments:[...memberAssignments].reverse()});
  const spanIds=['L','E','T1','B1','T4','B4','T7','B7'];
  assert.deepEqual(spanIds.map(id=>{
    const node=frame.nodes.find(row=>row.id===id);
    return [node.id,node.xIn,node.yIn];
  }),[['L',0,0],['E',600,0],['T1',75,25],['B1',75,0],['T4',300,100],['B4',300,0],['T7',525,25],['B7',525,0]]);
  assert.equal(frame.nodes.length,16);
  assert.equal(frame.members.length,29);
  assert.ok(!frame.nodes.some(node=>node.id==='HL'||node.id==='HE'));
  assert.deepEqual(frame.members.map(({id,startNodeId,endNodeId})=>[id,startNodeId,endNodeId]),
    topo.members.map(({id,start,end})=>[id,start,end]));
  assert.deepEqual(frame.supports,supports);
  const lower=build({...model,roof:{...roof,spanFt:8}});
  assert.equal(lower.nodes.find(node=>node.id==='E').xIn,96);
});

test('holds roof alternatives, stale or reversed directed members, and joint-as-bearing substitutions',()=>{
  for(const change of [{spanFt:50.0001},{spanFt:7.999},{family:'mono'},{heelHeightIn:1},{overhangIn:1},
    {bottomPitchRisePer12:0},{pitchRisePer12:0}])
    assert.throws(()=>build({...model,roof:{...roof,...change}}));
  const [first,...rest]=memberAssignments;
  for(const bad of [rest,[rest[0],...rest],
    [{...first,startNodeId:first.endNodeId,endNodeId:first.startNodeId},...rest],
    [{...first,memberId:'top-HL-T1',startNodeId:'HL'},...rest],
    [{...first,releaseStartRotation:undefined},...rest]])
    assert.throws(()=>build({...model,memberAssignments:bad}));
  for(const bad of [[supports[0]], [{...supports[0],nodeId:'T7'},supports[1]],
    [supports[0],{...supports[1],nodeId:'E'}]])
    assert.throws(()=>build({...model,supports:bad}),/support|bearing/iu);
});

test('runs only a preliminary ordinary double-Fink study and holds invalid targets or singular restraints',()=>{
  const out=study(request);
  assert.equal(out.family,'common');
  assert.equal(out.subtype,'symmetric-double-fink-reference');
  assert.equal(out.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(out.fabricationAuthorized,false);
  const foreign={caseId:'unused',sourceRef:'fixture unused load only',loads:[{nodeId:'HL',fxLb:0,fyLb:-10,momentLbIn:0}]};
  assert.throws(()=>study({...request,sources:[...request.sources,foreign]}),/unknown|not modeled|not present/iu);
  assert.throws(()=>study({...request,supports:supports.map(row=>({...row,fixX:false}))}),
    /singular|unstable|restraint|ill-conditioned/iu);
  assert.throws(()=>study({...request,machineReleaseAuthorized:true}));
});
