import test from 'node:test';
import assert from 'node:assert/strict';
import {captureAuthoredCase,replayAuthoredCase} from '../dist/analysis/src/authored-case-replay.js';
import {verifyCarriedBearingTransfers} from '../dist/analysis/src/carried-bearing-transfer.js';

const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[['A','B'],['B','C'],['A','C']].map(([a,b])=>({id:a+b,a,b,areaIn2:2,elasticModulusPsi:1e6})),
 loads:[],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]};
const girder={nodes:[{id:'G0',x:5,y:0},{id:'G1',x:53,y:8},{id:'G2',x:149,y:0}]};
const scope={caseId:'carried-explicit',description:'Synthetic carried load',modelId:'T1',modelRevision:'R2'};
const common={caseId:'girder-case',girderId:'G',nodeId:'G1',stationIn:48,face:'authored near face'};
const direct={...common,patchId:'direct',route:{kind:'direct'}};
const patch={...common,patchId:'carried',route:{kind:'carried',carriedSupportId:'T1-A'}};
const expected={caseId:common.caseId,girderId:common.girderId,stationOriginXIn:5,patches:[direct,patch]};
const source={patchId:patch.patchId,carriedSupportId:patch.route.carriedSupportId,bearingNodeId:'A',scope};
function fixture(fyLb=-120){
 const channels=[{id:'synthetic-channel',provenance:'source worksheet',loads:[{nodeId:'B',fyLb}]}];
 const receipt=captureAuthoredCase(scope,model,channels);
 const reaction=replayAuthoredCase(receipt,scope,model,channels).case.result.reactionLb.A.y;
 const patches=[{...direct,fyLb:-60,provenance:'distinct patch note'},{...patch,fyLb:-reaction,provenance:'carried note'}];
 return {patches,input:{...source,receipt,model,channels}};
}

test('binds the exact revised carried case and bearing, preserving vertical sign and provenance',()=>{
 for(const [load,want] of [[-120,60],[120,-60]]){
  const {patches,input}=fixture(load);
  const transfer=verifyCarriedBearingTransfers(girder,expected,patches,[source],[input]);
  const trace=transfer.transfers[0];
  assert.ok(Math.abs(trace.sourceReactionYLb-want)<1e-9);
  assert.equal(trace.receiverForceYLb,-trace.sourceReactionYLb);
  assert.deepEqual(trace.sourceScope,scope);
  assert.equal(trace.sourceChannels[0].provenance,'source worksheet');
  assert.equal(trace.receiver.face,common.face);
  assert.ok(Math.abs(transfer.jointLoads[0].fyLb-(-60-want))<1e-9);
  assert.equal(transfer.manufacturingApproved,false);
 }
});

test('rejects duplicate route ownership before any solve, stale revision, wrong support and mismatched force',()=>{
 const {patches,input}=fixture();
 const stale={...input,scope:{...scope,modelRevision:'R1'}};
 assert.throws(()=>verifyCarriedBearingTransfers(girder,expected,[...patches,
  {...patches[0],route:patch.route}],[source],[stale]),/Duplicate source patch/);
 assert.throws(()=>verifyCarriedBearingTransfers(girder,expected,patches,[source],[stale]),/expected case, revision or bearing/);
 assert.throws(()=>verifyCarriedBearingTransfers(girder,expected,patches,[source],[{...input,bearingNodeId:'C'}]),/expected case, revision or bearing/);
 assert.throws(()=>verifyCarriedBearingTransfers(girder,expected,[patches[0],{...patches[1],fyLb:60}],[source],[input]),/action-reaction/);
 const altered=structuredClone(input);
 altered.channels[0].loads[0].fyLb+=5;
 assert.throws(()=>verifyCarriedBearingTransfers(girder,expected,patches,[source],[altered]),/signed channel inputs changed/);
});

test('does not allow the same whole source bearing reaction to be claimed by a second patch identity',()=>{
 const {patches,input}=fixture();
 const extra={...patches[1],patchId:'second-claim'};
 const duplicated={...expected,patches:[...expected.patches,extra]};
 assert.throws(()=>verifyCarriedBearingTransfers(girder,duplicated,[...patches,extra],
   [source,{...source,patchId:extra.patchId}],[input,{...input,patchId:extra.patchId}]),/whole|full carried bearing/);
});
