import assert from 'node:assert/strict';
import test from 'node:test';
import { studyElasticFrameRectangularCut } from '../dist/analysis/src/elastic-frame-rectangular-cut-study.js';

const rectangle={actualWidthIn:1.5,actualDepthIn:3.5};
const member={id:'beam',startNodeId:'A',endNodeId:'B',areaIn2:5.25,secondMomentIn4:5.359375,elasticModulusPsi:1e6};
const frame={
 nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:24,yIn:0}],
 members:[member],
 supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:true}],
 loads:[{nodeId:'B',fxLb:21,fyLb:-40,momentLbIn:0}],
};
const selection={memberId:'beam',cut:{stationIn:8,side:'continuous'},rectangle};
const input={frame,selection};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('normal stress uses the authored 1.5 by 3.5 in orientation at one solved signed cut',()=>{
 const result=studyElasticFrameRectangularCut(input);
 assert.equal(result.memberId,'beam');
 assert.equal(result.startNodeId,'A');
 assert.equal(result.endNodeId,'B');
 assert.equal(result.cut.stationIn,8);
 assert.equal(result.cut.side,'continuous');
 near(result.cut.axialLb,21);
 near(result.cut.momentLbIn,-640);
 const study=result.normalStress;
 assert.equal(study.section.areaIn2,5.25);
 assert.equal(study.section.inertiaAboutWidthIn4,5.359375);
 const extreme=640*1.75/5.359375;
 for(const fiber of study.peakAxialFiberStresses){
  near(fiber.combinedNormalPsi,4+Math.sign(fiber.yIn)*extreme);
 }
 assert.equal(study.approvedForStructuralUse,false);
 assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(result.fabricationAuthorized,false);
});

test('a swapped same-area rectangle, unknown member, or out-of-range or invalid-sided cut is held',()=>{
 for(const bad of [
  {...selection,rectangle:{actualWidthIn:3.5,actualDepthIn:1.5}},
  {...selection,rectangle:{...rectangle,actualWidthIn:1.5001}},
  {...selection,memberId:'not-solved'},
  {...selection,cut:{...selection.cut,stationIn:24.001}},
  {...selection,cut:{...selection.cut,side:'right'}},
 ]){
  assert.throws(()=>studyElasticFrameRectangularCut({...input,selection:bad}));
 }
});

test('caller force replacements, capacity data, and precomputed selections are not accepted',()=>{
 const noExtras=[
  {...input,forces:{axialLb:21,shearLb:40,momentLbIn:-640}},
  {...input,selection:{...selection,cut:{...selection.cut,axialLb:21,momentLbIn:-640}}},
  {...input,selection:{...selection,rectangle:{...rectangle,fbPsi:1500}}},
  {...input,frame:{...frame,memberSectionCuts:[{memberId:'beam',cuts:[selection.cut]}]}},
 ];
 for(const bad of noExtras){
  assert.throws(()=>studyElasticFrameRectangularCut(bad));
 }
});
