import assert from 'node:assert/strict';
import test from 'node:test';
import {generateRaisedHeelCommonTopology} from '../dist/geometry/src/raised-heel-common-topology.js';
import {buildRaisedHeelCommonAuthoredElasticFrameModel as build}
  from '../dist/analysis/src/raised-heel-common-authored-elastic-frame-model.js';
import {studyAuthoredRaisedHeelCommonElasticFrameReactions as study}
  from '../dist/analysis/src/raised-heel-common-authored-elastic-frame-study.js';

const roof={family:'common',spanFt:50,pitchRisePer12:4,heelHeightIn:48};
const topo=generateRaisedHeelCommonTopology(roof);
const memberAssignments=topo.members.map(({id,start,end})=>({memberId:id,startNodeId:start,endNodeId:end,
  areaIn2:5,secondMomentIn4:14,elasticModulusPsi:1_000_000,releaseStartRotation:false,releaseEndRotation:false}));
const supports=[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},{nodeId:'E',fixX:false,fixY:true,fixRotation:false}];
const model={roof,memberAssignments,supports};
const request={...model,modelId:'heel-synthetic',modelRevision:'r1',originNodeId:'L',
  sources:[{caseId:'corner-load',sourceRef:'fixture load only',loads:[{nodeId:'HL',fxLb:0,fyLb:-100,momentLbIn:0}]}],
  combinations:[{caseId:'combined',sourceRef:'fixture combination only',terms:[{caseId:'corner-load',factor:1}]}]};

test('keeps authored bearings separate from top heels at the 50-foot span and 48-inch heel limit',()=>{
  const frame=build({...model,memberAssignments:[...memberAssignments].reverse()});
  const topBearingIds=['L','HL','E','HE'];
  assert.deepEqual(topBearingIds.map(id=>{
    const node=frame.nodes.find(row=>row.id===id);
    return [node.id,node.xIn,node.yIn];
  }),[['L',0,0],['HL',0,48],['E',600,0],['HE',600,48]]);
  assert.deepEqual(frame.members.map(({id,startNodeId,endNodeId})=>[id,startNodeId,endNodeId]),
    topo.members.map(({id,start,end})=>[id,start,end]));
  assert.ok(frame.members.some(row=>row.id==='web-L-HL'&&row.startNodeId==='L'&&row.endNodeId==='HL'));
  assert.ok(frame.members.some(row=>row.id==='web-HE-E'&&row.startNodeId==='HE'&&row.endNodeId==='E'));
  assert.deepEqual(JSON.parse(JSON.stringify(frame.supports)),supports);
  assert.equal(build({...model,roof:{...roof,heelHeightIn:1}}).nodes.find(node=>node.id==='HL').yIn,1);
  assert.equal(build({...model,roof:{...roof,overhangIn:0}}).nodes.find(node=>node.id==='HE').yIn,48);
});

test('holds overspan, wrong roof family, unsupported pitch/overhang and absent or out-of-range heel',()=>{
  const {heelHeightIn:_,...unraised}=roof;
  for(const invalid of [unraised,
    ...[{spanFt:50.0001},{spanFt:7.99},{family:'scissor'},{heelHeightIn:0},{heelHeightIn:48.01},{heelHeightIn:NaN},
      {overhangIn:1},{bottomPitchRisePer12:0},{pitchRisePer12:0}].map(change=>({...roof,...change})),
  ]) assert.throws(()=>build({...model,roof:invalid}));
});

test('holds omitted, duplicate and stale/reversed directed assignments and substituted heel supports',()=>{
  const [target,...remaining]=memberAssignments;
  for(const invalid of [remaining,[remaining[0],...remaining],
    [{...target,startNodeId:target.endNodeId,endNodeId:target.startNodeId},...remaining],
    [{...target,memberId:'top-L-Q1'},...remaining],
    [{...target,releaseEndRotation:undefined},...remaining],
  ]) assert.throws(()=>build({...model,memberAssignments:invalid}));
  for(const invalid of [[{...supports[0],nodeId:'HL'},supports[1]],
    [supports[0],{...supports[1],nodeId:'HE'}],[supports[0],{...supports[1],nodeId:'L'}],
  ]) assert.throws(()=>build({...model,supports:invalid}),/support|bearing/iu);
});

test('reaction study accepts an authored top-heel action, but rejects foreign or release-authority fields',()=>{
  const outcome=study(request);
  assert.equal(outcome.family,'common');
  assert.equal(outcome.subtype,'symmetric-raised-heel-reference');
  assert.equal(outcome.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(outcome.fabricationAuthorized,false);
  for(const extra of [{originNodeId:'foreign'}, {machineReleaseAuthorized:true},
    {sources:[{...request.sources[0],loads:[{...request.sources[0].loads[0],nodeId:'foreign'}]}]},
    {frame:{nodes:[]}},
  ]) assert.throws(()=>study({...request,...extra}));
});

test('checks unused source targets and does not make singular authored restraints stable',()=>{
  const unused={caseId:'unused',sourceRef:'fixture unused load only',
    loads:[{nodeId:'unknown-heel',fxLb:0,fyLb:-50,momentLbIn:0}]};
  assert.throws(()=>study({...request,sources:[...request.sources,unused]}),/unknown|not modeled|not present/iu);
  const verticalOnly=supports.map(row=>({...row,fixX:false}));
  assert.throws(()=>study({...request,supports:verticalOnly}),/singular|unstable|restraint|ill-conditioned/iu);
});
