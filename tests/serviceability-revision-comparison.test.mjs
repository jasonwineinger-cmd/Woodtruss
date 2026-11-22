import test from 'node:test';
import assert from 'node:assert/strict';
import {captureAuthoredCase} from '../dist/analysis/src/authored-case-replay.js';
import {compareAuthoredServiceabilityRevisions} from '../dist/analysis/src/serviceability-revision-comparison.js';

const triangle=(height,area)=>({nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:height},{id:'C',x:240,y:0}],
 bars:[['A','B'],['B','C'],['A','C']].map(([a,b])=>({id:a+b,a,b,areaIn2:area,elasticModulusPsi:1e6})),
 loads:[],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]});
function revision(modelRevision,height,area,fyLb) {
 const model=triangle(height,area),caseId='explicit-'+modelRevision;
 const scope={caseId,description:'Synthetic authored '+modelRevision,modelId:'T1',modelRevision};
 const channels=[{id:'load',provenance:'independent worksheet '+modelRevision,loads:[{nodeId:'B',fyLb}]}];
 return {input:{model,cases:[{caseId,channels,receipt:captureAuthoredCase(scope,model,channels)}]},
   expected:{modelId:'T1',modelRevision,cases:[scope],datum:{nodeId:'B',leftBearingNodeId:'A',rightBearingNodeId:'C'}}};
}
const earlier=revision('R1',120,2,-1000),later=revision('R2',120,4,-1000);
const compare=(a,b,patch={})=>compareAuthoredServiceabilityRevisions({
 before:a.expected,after:b.expected,pairs:[{beforeCaseId:'explicit-R1',afterCaseId:'explicit-R2'}],...patch,
},a.input,b.input);

test('reports signed movement difference for independently expected revised stiffness on matching modeled layout',()=>{
 const out=compare(earlier,later);
 const [p]=out.pairs;
 const work=1000*(120*Math.SQRT2+240/4)/2e6;
 assert.ok(Math.abs(p.before.relativeYIn+work)<1e-9);
 assert.ok(Math.abs(p.after.relativeYIn+work/2)<1e-9);
 assert.ok(Math.abs(p.signedDeltaYIn-work/2)<1e-9);
 assert.equal(p.after.sourceChannels[0].provenance,'independent worksheet R2');
 assert.equal(out.layoutMatched,true);
 assert.equal(out.physicalCorrespondenceVerified,false);
 assert.equal(out.manufacturingApproved,false);
});

test('keeps separately sourced signed results but does not compare across changed geometry',()=>{
 const out=compare(earlier,revision('R2',90,4,500));
 assert.equal(out.layoutMatched,false);
 assert.equal(out.pairs[0].signedDeltaYIn,null);
 assert.ok(out.pairs[0].before.relativeYIn<0);
 assert.ok(out.pairs[0].after.relativeYIn>0);
});

test('rejects invented case pair, reused revision, or altered same-ID receipt model',()=>{
 assert.throws(()=>compare(earlier,later,{pairs:[{beforeCaseId:'explicit-R1',afterCaseId:'wrong'}]}),/one-to-one/);
 assert.throws(()=>compare(earlier,earlier),/distinct expected/);
 const altered=structuredClone(later);
 altered.input.model.nodes[1].y=10;
 assert.throws(()=>compare(earlier,altered),/model inputs changed/);
});
