import test from 'node:test';
import assert from 'node:assert/strict';
import {studyAuthoredElasticFrameCombinationStress} from '../dist/analysis/src/elastic-frame-authored-combination-stress.js';

const frame={nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:6,yIn:8}],
  members:[{id:'AB',startNodeId:'A',endNodeId:'B',areaIn2:8,secondMomentIn4:32/3,elasticModulusPsi:1.4e6}],
  supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:true}]};
const source=(caseId, qxLbPerIn,qyLbPerIn,fxLb,fyLb)=>({caseId,sourceRef:'synthetic:'+caseId,loads:[],
  memberLoads:[{memberId:'AB',basis:'horizontal-projection',qxLbPerIn,qyLbPerIn}],
  memberPointLoads:[{memberId:'AB',stationIn:2,fxLb,fyLb}]});
const input={modelId:'fixture',modelRevision:'R1',frame,
  sources:[source('A-load',2,-3,5,-4),source('B-load',-1,2,-3,2)],
  combinations:[{caseId:'weighted',sourceRef:'fixture arithmetic only',
    terms:[{caseId:'A-load',factor:2},{caseId:'B-load',factor:-0.5}]}],
  members:[{memberId:'AB',rectangle:{actualWidthIn:2,actualDepthIn:4}}]};
const near=(value,expected)=>assert.ok(Math.abs(value-expected)<1e-8,`${value} vs ${expected}`);

test('weighted inclined actions preserve projected-load measure, local force and the true point lever arm',()=>{
  const report=studyAuthoredElasticFrameCombinationStress(input);
  const edge=report.memberEnvelope.AB.positiveDepth.max;
  // Independent global free body: UDL uses 6 in horizontally, concentrated
  // action acts at (1.2,1.6); project the resulting (+38.5,−51) lb only once.
  const M=3*(-42)-4*27 + 1.2*(-9)-1.6*11.5;
  assert.equal(edge.caseId,'weighted');
  assert.equal(edge.stationIn,0);
  assert.equal(edge.side,'continuous');
  near(edge.axialLb,0.6*38.5+0.8*(-51));
  near(edge.shearLb,-0.8*38.5+0.6*(-51));
  near(edge.momentLbIn,M);
  near(edge.normalStressPsi,edge.axialLb/8-M/(16/3));
  assert.equal(report.fabricationAuthorized,false);
});

test('a declared but unused source must still bind to an actual target and localization in the shared model',()=>{
  const base=source('unused',0,1,0,-1);
  for(const unknown of [
    {...base,loads:[{nodeId:'other-model',fxLb:1,fyLb:0,momentLbIn:0}]},
    {...base,memberPointLoads:[{memberId:'AB',stationIn:10,fxLb:0,fyLb:-1}]},
    {...base,memberLoads:[{memberId:'foreign',basis:'member-length',qxLbPerIn:0,qyLbPerIn:-1}]},
  ]) assert.throws(()=>studyAuthoredElasticFrameCombinationStress({...input,sources:[...input.sources,unknown]}),
    /source|member|node|localized/i);
});
