import assert from 'node:assert/strict';
import test from 'node:test';
import { studyAuthoredElasticFrameStressCases } from '../dist/analysis/src/elastic-frame-authored-stress-cases.js';

const rectangle={actualWidthIn:1.5,actualDepthIn:3.5};
const frame={
 nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:24,yIn:0}],
 members:[{id:'AB',startNodeId:'A',endNodeId:'B',areaIn2:5.25,secondMomentIn4:5.359375,elasticModulusPsi:1e6}],
 supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:true}],
};
const first={caseId:'z-first',loads:[{nodeId:'B',fxLb:21,fyLb:-40,momentLbIn:0}]};
const latest={caseId:'a-latest',loads:[{nodeId:'B',fxLb:-9,fyLb:30,momentLbIn:0}]};
const selected={memberId:'AB',rectangle};
const input={modelId:'frame-fixture',modelRevision:'r4',frame,cases:[first,latest],members:[selected]};
const study=changes=>studyAuthoredElasticFrameStressCases({...input,...changes});

test('authored cases retain caller ordering; an unsolved last case cannot return a partial stress comparison',()=>{
 const before=JSON.stringify(input);
 const baseline=study();
 assert.deepEqual(baseline.caseResults.map(row=>row.caseId),['z-first','a-latest']);
 assert.equal(baseline.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(baseline.fabricationAuthorized,false);
 const unknownJoint={...latest,loads:[{...latest.loads[0],nodeId:'unmodeled'}]};
 assert.throws(()=>study({cases:[first,unknownJoint]}),/Authored frame stress case a-latest failed/u);
 assert.equal(JSON.stringify(input),before);
 assert.deepEqual(study(),baseline);
});

test('authored stress inputs exclude case/model substitution, cached results and capacity data',()=>{
 const cached=study();
 for(const altered of [
  {cases:[first,{...latest,result:cached}]},
  {cases:[first,{...latest,members:frame.members}]},
  {cases:[first,{...latest,modelRevision:'r5'}]},
  {frame:{...frame,displacements:{A:{uxIn:0}}}},
  {members:[{...selected,rectangle:{...rectangle,fbPsi:1500}}]},
  {members:[{...selected,fabricationAuthorized:true}]},
 ]){
  assert.throws(()=>study(altered),/case|frame|member|rectang|field/iu);
 }
});

test('duplicate authorship, malformed case loads and equal-area wrong axes fail closed',()=>{
 for(const altered of [
  {cases:[first,{...latest,caseId:first.caseId}]},
  {cases:[first,{...latest,loads:[{...latest.loads[0],momentLbIn:null}]}]},
  {members:[selected,selected]},
  {members:[{...selected,memberId:'not-in-frame'}]},
  {members:[{...selected,rectangle:{actualWidthIn:3.5,actualDepthIn:1.5}}]},
 ]){
  assert.throws(()=>study(altered),/case|load|member|rectang|inertia/iu);
 }
});
