import test from 'node:test';
import assert from 'node:assert/strict';
import {captureAuthoredCase,replayAuthoredCase} from '../dist/analysis/src/authored-case-replay.js';
import {envelopeReceivingGirderReactions} from '../dist/analysis/src/receiving-reaction-envelope.js';

const triangle=(span,x)=>({
 nodes:[{id:'A',x:0,y:0},{id:'B',x,y:30},{id:'C',x:span,y:0}],
 bars:[['A','B'],['B','C'],['A','C']].map(([a,b])=>({id:a+b,a,b,areaIn2:2,elasticModulusPsi:1e6})),
 loads:[],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}],
});
const model=triangle(144,48);
function sample(label,fy){
 const receiver={girderId:'G',modelRevision:'R2',caseId:'receiver-'+label,description:'Synthetic receiver'};
 const scope={modelId:'T',modelRevision:'R6',caseId:'source-'+label,description:'Synthetic source'};
 const patch={caseId:receiver.caseId,girderId:receiver.girderId,stationIn:48,nodeId:'B',
   face:'authored face',patchId:'p',route:{kind:'carried',carriedSupportId:'T-A'}};
 const mapping={patchId:'p',carriedSupportId:'T-A',bearingNodeId:'A',scope};
 const sourceModel=triangle(120,60);
 const channels=[{id:'test-action',provenance:'synthetic '+label,loads:[{nodeId:'B',fyLb:fy}]}];
 const receipt=captureAuthoredCase(scope,sourceModel,channels);
 const sourceR=replayAuthoredCase(receipt,scope,sourceModel,channels).case.result.reactionLb.A.y;
 return {expected:{receiver,receiverModel:structuredClone(model),patchCase:{caseId:receiver.caseId,girderId:'G',
   stationOriginXIn:0,patches:[patch]},carriedMappings:[mapping]},
   input:{receiver,patches:[{...patch,fyLb:-sourceR,provenance:'source '+label}],carried:[{...mapping,model:sourceModel,receipt,channels}]}};
}
const entries=[sample('down',-120),sample('up',60),sample('up-tie',60)];
const expected={girderId:'G',modelRevision:'R2',bearingNodeIds:['A','C'],cases:entries.map(row=>row.expected)};
const inputs=entries.map(row=>row.input);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('keeps signed receiving extrema and the exact source provenance including ties',()=>{
 const out=envelopeReceivingGirderReactions(expected,model,inputs);
 assert.equal(out.manufacturingApproved,false);
 assert.equal(out.coupledModelVerified,false);
 assert.deepEqual(out.caseIds,['receiver-down','receiver-up','receiver-up-tie']);
 const [a,c]=out.bearings;
 close(a.minYLb,-20);close(a.maxYLb,40);
 close(c.minYLb,-10);close(c.maxYLb,20);
 assert.deepEqual(a.governingMin.map(row=>row.sourceTransfers[0].sourceScope.caseId),['source-up','source-up-tie']);
 assert.equal(c.governingMax[0].sourceTransfers[0].sourceScope.modelRevision,'R6');
 assert.equal(c.governingMax[0].patchReceipts[0].provenance,'source down');
});

test('rejects missing, reordered, wrong-generation or geometric case scope',()=>{
 assert.throws(()=>envelopeReceivingGirderReactions(expected,model,inputs.slice(1)),/exact ordered/i);
 assert.throws(()=>envelopeReceivingGirderReactions(expected,model,[...inputs].reverse()),/exact ordered/i);
 assert.throws(()=>envelopeReceivingGirderReactions({...expected,modelRevision:'R3'},model,inputs),/common revision/);
 assert.throws(()=>envelopeReceivingGirderReactions({...expected,bearingNodeIds:['B']},model,inputs),/vertically restrained/);
 const changed=structuredClone(expected);
 changed.cases[1].receiverModel.nodes[1].y+=9;
 assert.throws(()=>envelopeReceivingGirderReactions(changed,model,inputs),/model inputs differ/);
});
