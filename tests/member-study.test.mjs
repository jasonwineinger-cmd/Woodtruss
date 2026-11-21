import test from 'node:test';
import assert from 'node:assert/strict';
import {runPreliminaryMemberStudy} from '../dist/analysis/src/member-study.js';
const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1e6},
 {id:'BC',a:'B',b:'C',areaIn2:2,elasticModulusPsi:1e6},
 {id:'AC',a:'A',b:'C',areaIn2:2,elasticModulusPsi:1e6}],
 loads:[],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]};
const catalog={catalogId:'TEST ONLY',records:[{speciesGroup:'TEST',grade:'TEST',nominalSize:'2x4',actualWidthIn:1.5,actualDepthIn:3.5,referenceEdition:'TEST',referencePublisher:'TEST',referenceTable:'TEST',referenceValueId:'TEST-2x4',fbPsi:1,ftPsi:1,fcPsi:1,fvPsi:1,ePsi:2,eMinPsi:1}]};
test('multiple load cases connect to preliminary lumber demands',()=>{
 const r=runPreliminaryMemberStudy(model,[
  {id:'gravity',description:'illustrative gravity',jointLoads:[{nodeId:'B',fyLb:-1000}]},
  {id:'uplift',description:'illustrative uplift',jointLoads:[{nodeId:'B',fyLb:500}]}
 ],catalog);
 assert.equal(r.designCandidateCount,3);
 assert.equal(r.memberDemandPreviews.every(x=>x.approvedForStructuralUse===false),true);
 assert.ok(r.maximumTensionLb>0);
 assert.ok(r.maximumCompressionLb>0);
 assert.deepEqual(r.scenarioIds,['gravity','uplift']);
});
test('unverified catalog cannot be omitted',()=>{
 assert.throws(()=>runPreliminaryMemberStudy(model,[{id:'gravity',description:'test',jointLoads:[]}],{catalogId:'empty',records:[]}));
});
