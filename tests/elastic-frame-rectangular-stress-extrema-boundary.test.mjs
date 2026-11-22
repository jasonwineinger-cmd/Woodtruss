import assert from 'node:assert/strict';
import test from 'node:test';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const rectangle={actualWidthIn:1.5,actualDepthIn:3.5};
const frame={
 nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:24,yIn:0},{id:'C',xIn:36,yIn:0}],
 members:[{id:'AB',startNodeId:'A',endNodeId:'B',areaIn2:5.25,secondMomentIn4:5.359375,elasticModulusPsi:1e6},
  {id:'BC',startNodeId:'B',endNodeId:'C',areaIn2:5.25,secondMomentIn4:5.359375,elasticModulusPsi:1e6}],
 supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:true}],
 loads:[{nodeId:'B',fxLb:21,fyLb:-40,momentLbIn:0}],
};
const query={memberId:'AB',rectangle};
const solve=(requests)=>solveElasticFrame({...frame,memberRectangularStressExtrema:requests});

test('opting into exact stress extrema does not change the frame solution or authorize fabrication',()=>{
 const baseline=solveElasticFrame(frame);
 const {memberRectangularStressExtrema:unused,...oldFields}=baseline;
 assert.deepEqual(Object.keys(unused??{}),[]);
 const {memberRectangularStressExtrema:extrema,...queriedFields}=solve([query]);
 assert.deepEqual(Object.keys(queriedFields.memberSectionDemand).sort(),['AB','BC']);
 assert.deepEqual(Object.keys(extrema),['AB']);
 assert.deepEqual(queriedFields,oldFields);
 assert.equal(queriedFields.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(queriedFields.fabricationAuthorized,false);
});

test('stress-extrema queries reject wrong orientation, unbound members, duplicate requests and capacity inputs',()=>{
 for(const requests of [
  [{...query,rectangle:{actualWidthIn:3.5,actualDepthIn:1.5}}],
  [{...query,memberId:'BA'}],
  [query,query],
  [{...query,rectangle:{...rectangle,fbPsi:1500}}],
  [{...query,axialLb:21,momentLbIn:-40*24}],
 ]){
  assert.throws(()=>solve(requests),/rectang|stress|member/iu);
 }
});
