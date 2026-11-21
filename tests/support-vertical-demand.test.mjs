import test from 'node:test';
import assert from 'node:assert/strict';
import {captureAuthoredCase} from '../dist/analysis/src/authored-case-replay.js';
import {auditSupportVerticalDemand} from '../dist/analysis/src/support-vertical-demand.js';

const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:48,y:30},{id:'C',x:144,y:0}],
 bars:[['A','B'],['B','C'],['A','C']].map(([a,b])=>({id:a+b,a,b,areaIn2:2,elasticModulusPsi:1e6})),
 loads:[],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]};
const samples=[['down',-120],['uplift',60],['uplift-tie',60],['zero',0]].map(([caseId,fyLb])=>{
 const scope={caseId,description:'Synthetic '+caseId,modelId:'truss',modelRevision:'R2'};
 const channels=[{id:'input',provenance:'sheet '+caseId,loads:[{nodeId:'B',fyLb}]}];
 return {scope,input:{caseId,channels,receipt:captureAuthoredCase(scope,model,channels)}};
});
const expected={modelId:'truss',modelRevision:'R2',supportNodeIds:['A','C'],cases:samples.map(s=>s.scope)};
const supplied=samples.map(s=>s.input);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('separates signed compression and required hold-down and retains governing authored cases',()=>{
 const result=auditSupportVerticalDemand(expected,model,supplied);
 const [a,c]=result.supports;
 close(a.bearingCompressionLb,80);close(c.bearingCompressionLb,40);
 close(a.holdDownTensionLb,40);close(c.holdDownTensionLb,20);
 close(a.perCase[1].signedReactionYLb,-40);
 assert.equal(a.perCase[1].bearingCompressionLb,0);
 assert.equal(a.perCase[0].holdDownTensionLb,0);
 assert.deepEqual(a.governingBearingCases,['down']);
 assert.deepEqual(c.governingHoldDownCases,['uplift','uplift-tie']);
 assert.equal(a.perCase[2].sourceChannels[0].provenance,'sheet uplift-tie');
 assert.equal(result.anchorageVerified,false);
 assert.equal(result.contactVerified,false);
 assert.equal(result.manufacturingApproved,false);
 const zero=auditSupportVerticalDemand({...expected,cases:[samples[3].scope]},model,[supplied[3]]);
 assert.deepEqual(zero.supports[0].governingBearingCases,[]);
 assert.deepEqual(zero.supports[0].governingHoldDownCases,[]);
});

test('rejects stale or missing case/channel coverage, wrong support, and changed model',()=>{
 assert.throws(()=>auditSupportVerticalDemand(expected,model,supplied.slice(1)),/exact ordered/i);
 assert.throws(()=>auditSupportVerticalDemand(expected,model,[...supplied].reverse()),/exact ordered/i);
 assert.throws(()=>auditSupportVerticalDemand({...expected,modelRevision:'R1'},model,supplied),/model revision/);
 assert.throws(()=>auditSupportVerticalDemand({...expected,supportNodeIds:['B']},model,supplied),/vertically restrained/);
 const stale=structuredClone(model);stale.nodes[1].x+=2;
 assert.throws(()=>auditSupportVerticalDemand(expected,stale,supplied),/model inputs changed/);
 const altered=structuredClone(supplied);altered[0].channels[0].loads[0].fyLb+=1;
 assert.throws(()=>auditSupportVerticalDemand(expected,model,altered),/signed channel inputs changed/);
});
