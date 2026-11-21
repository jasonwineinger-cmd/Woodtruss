import test from 'node:test';
import assert from 'node:assert/strict';
import {captureAuthoredCase,replayAuthoredCase} from '../dist/analysis/src/authored-case-replay.js';

const scope={caseId:'manual-case',description:'Synthetic test only',modelId:'triangle',modelRevision:'R1'};
const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1e6},
 {id:'BC',a:'B',b:'C',areaIn2:2,elasticModulusPsi:1e6},
 {id:'AC',a:'A',b:'C',areaIn2:2,elasticModulusPsi:1e6}],
 loads:[],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]};
const channels=[{id:'down',provenance:'synthetic A',loads:[{nodeId:'B',fxLb:55,fyLb:-1200}]},
 {id:'up',provenance:'synthetic B',loads:[{nodeId:'B',fxLb:-55,fyLb:200}]}];

test('replays exact independently expected receipt and triangle equilibrium',()=>{
 const persisted=JSON.parse(JSON.stringify(captureAuthoredCase(scope,model,channels)));
 assert.deepEqual(persisted.jointLoads,[{nodeId:'B',fxLb:0,fyLb:-1000}]);
 const out=replayAuthoredCase(persisted,scope,model,channels);
 assert.equal(out.case.id,scope.caseId);
 assert.equal(out.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(out.manufacturingApproved,false);
 assert.ok(Math.abs(out.case.result.reactionLb.A.y-500)<1e-9);
 assert.ok(Math.abs(out.case.result.reactionLb.C.y-500)<1e-9);
 assert.ok(Math.abs(out.case.result.axialForceLb.AC-500)<1e-9);
});

test('rejects stale scope, same-ID changed stiffness, reordering and changed channel despite equal totals',()=>{
 const receipt=captureAuthoredCase(scope,model,channels);
 assert.throws(()=>replayAuthoredCase(receipt,{...scope,modelRevision:'R2'},model,channels),/stale/);
 const revised=structuredClone(model);
 revised.bars[0].elasticModulusPsi*=2;
 assert.throws(()=>replayAuthoredCase(receipt,scope,revised,channels),/model inputs changed/);
 assert.throws(()=>replayAuthoredCase(receipt,scope,model,[...channels].reverse()),/channel inputs changed/);
 const changed=structuredClone(channels);
 changed[0].loads[0].fyLb-=1;
 changed[1].loads[0].fyLb+=1;
 assert.deepEqual(captureAuthoredCase(scope,model,changed).jointLoads,receipt.jointLoads);
 assert.throws(()=>replayAuthoredCase(receipt,scope,model,changed),/channel inputs changed/);
 const bad=structuredClone(receipt);
 bad.jointLoads[0].fyLb+=1;
 assert.throws(()=>replayAuthoredCase(bad,scope,model,channels),/totals differ/);
 assert.throws(()=>replayAuthoredCase({...receipt,manufacturingApproved:true},scope,model,channels),/unrecognized/);
});
