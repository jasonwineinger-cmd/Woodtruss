import test from 'node:test';
import assert from 'node:assert/strict';
import {captureAuthoredCase,replayAuthoredCase} from '../dist/analysis/src/authored-case-replay.js';
import {solveReceivingGirderCase} from '../dist/analysis/src/receiving-girder-case.js';

const triangle=(span,x)=>({
 nodes:[{id:'A',x:0,y:0},{id:'B',x,y:30},{id:'C',x:span,y:0}],
 bars:[['A','B'],['B','C'],['A','C']].map(([a,b])=>({id:a+b,a,b,areaIn2:2,elasticModulusPsi:1e6})),
 loads:[{nodeId:'B',fyLb:1000}],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}],
});
const receiver={girderId:'G',modelRevision:'Girder R2',caseId:'receiving-only',description:'Synthetic reconstructed girder case'};
const sourceScope={modelId:'T',modelRevision:'Carried R3',caseId:'source-only',description:'Synthetic carried case'};
const common={caseId:receiver.caseId,girderId:receiver.girderId,stationIn:48,nodeId:'B',face:'authored face'};
const direct={...common,patchId:'distinct-direct',route:{kind:'direct'}};
const carried={...common,patchId:'distinct-carried',route:{kind:'carried',carriedSupportId:'T-A'}};
const explicitMapping={patchId:carried.patchId,carriedSupportId:'T-A',bearingNodeId:'A',scope:sourceScope};
const expected={receiver,receiverModel:triangle(144,48),patchCase:{caseId:receiver.caseId,girderId:receiver.girderId,
 stationOriginXIn:0,patches:[direct,carried]},carriedMappings:[explicitMapping]};
function fixture(){
 const sourceModel=triangle(120,60), receivingModel=triangle(144,48);
 const channels=[{id:'source-force',provenance:'synthetic carried worksheet',loads:[{nodeId:'B',fyLb:-120}]}];
 const receipt=captureAuthoredCase(sourceScope,sourceModel,channels);
 const solved=replayAuthoredCase(receipt,sourceScope,sourceModel,channels).case.result;
 return {receivingModel,sourceReactions:solved.reactionLb,patches:[
   {...direct,fyLb:-60,provenance:'separate synthetic direct patch'},
   {...carried,fyLb:-solved.reactionLb.A.y,provenance:'synthetic designated bearing'},
 ],input:{...explicitMapping,channels,receipt,model:sourceModel}};
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('solves the mapped receiving case and closes combined two-model vertical force balance',()=>{
 const {receivingModel,sourceReactions,patches,input}=fixture();
 const out=solveReceivingGirderCase(expected,receiver,receivingModel,patches,[input]);
 assert.equal(out.case.id,receiver.caseId);
 assert.equal(out.transfer.transfers[0].sourceScope.caseId,sourceScope.caseId);
 assert.deepEqual(out.case.model.loads,[{nodeId:'B',fxLb:0,fyLb:patches[0].fyLb+patches[1].fyLb}]);
 close(out.case.result.reactionLb.A.y,80);
 close(out.case.result.reactionLb.C.y,40);
 close(sourceReactions.C.y,60);
 // The selected source bearing is internal: +60 on source, -60 on receiver.
 close(sourceReactions.A.y+out.transfer.transfers[0].receiverForceYLb,0);
 close(out.case.result.reactionLb.A.y+out.case.result.reactionLb.C.y+sourceReactions.C.y,180);
 assert.equal(out.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(out.coupledModelVerified,false);
 assert.equal(out.horizontalTransferVerified,false);
 assert.equal(out.manufacturingApproved,false);
});

test('rejects revisions, explicit case mapping changes, duplicate patches, and unmatched bearing forces',()=>{
 const {receivingModel,patches,input}=fixture();
 const changed=structuredClone(receivingModel);
 changed.bars[0].areaIn2=3;
 assert.throws(()=>solveReceivingGirderCase(expected,receiver,changed,patches,[input]),/model inputs differ/);
 assert.throws(()=>solveReceivingGirderCase(expected,{...receiver,modelRevision:'Girder R1'},receivingModel,patches,[input]),/exact expected mapping/);
 assert.throws(()=>solveReceivingGirderCase({...expected,carriedMappings:[]},receiver,receivingModel,patches,[input]),/exactly one carried/);
 assert.throws(()=>solveReceivingGirderCase(expected,receiver,receivingModel,patches,
   [{...input,scope:{...sourceScope,caseId:receiver.caseId}}]),/expected case, revision or bearing/);
 assert.throws(()=>solveReceivingGirderCase(expected,receiver,receivingModel,[...patches,patches[1]],[input]),/Duplicate source patch/);
 assert.throws(()=>solveReceivingGirderCase(expected,receiver,receivingModel,[patches[0],{...patches[1],fyLb:1000}],[input]),/action-reaction/);
});
