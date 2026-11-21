import test from 'node:test';
import assert from 'node:assert/strict';
import {captureAuthoredCase} from '../dist/analysis/src/authored-case-replay.js';
import {replayAuthoredRelativeJointY} from '../dist/analysis/src/authored-serviceability-replay.js';

const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[['A','B'],['B','C'],['A','C']].map(([a,b])=>({id:a+b,a,b,areaIn2:2,elasticModulusPsi:1e6})),
 loads:[],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]};
const records=[['down',-1000],['up',500]].map(([caseId,fyLb])=>{
 const scope={caseId,description:'Synthetic '+caseId,modelId:'T1',modelRevision:'R4'};
 const channels=[{id:'one',provenance:'source '+caseId,loads:[{nodeId:'B',fyLb}]}];
 return {scope,input:{caseId,channels,receipt:captureAuthoredCase(scope,model,channels)}};
});
const expected={modelId:'T1',modelRevision:'R4',cases:records.map(r=>r.scope),
 datum:{nodeId:'B',leftBearingNodeId:'A',rightBearingNodeId:'C'}};
const supplied=records.map(r=>r.input);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('rebuilds signed relative movement from authored loads, not any supplied result',()=>{
 const fake={...supplied[0],result:{displacementIn:{B:{y:55}}}};
 const out=replayAuthoredRelativeJointY(expected,model,[fake,supplied[1]]);
 const [down,up]=out.observations;
 const unit=(120*Math.SQRT2+240/4)/2e6;
 close(down.relativeYIn,-1000*unit);
 close(up.relativeYIn,500*unit);
 assert.deepEqual(down.sourceScope,records[0].scope);
 assert.equal(up.sourceChannels[0].provenance,'source up');
 assert.equal(out.modelRevision,'R4');
 assert.equal(out.codeDeflectionVerified,false);
 assert.equal(out.manufacturingApproved,false);
});

test('holds a stale case/revision, edited source, altered model, or unmodeled datum',()=>{
 assert.throws(()=>replayAuthoredRelativeJointY(expected,model,[...supplied].reverse()),/exact ordered/i);
 assert.throws(()=>replayAuthoredRelativeJointY({...expected,modelRevision:'R3'},model,supplied),/model revision/);
 const edited=structuredClone(supplied);
 edited[0].channels[0].loads[0].fyLb+=1;
 assert.throws(()=>replayAuthoredRelativeJointY(expected,model,edited),/signed channel inputs changed/);
 const stale=structuredClone(model);stale.bars[0].areaIn2+=1;
 assert.throws(()=>replayAuthoredRelativeJointY(expected,stale,supplied),/model inputs changed/);
 assert.throws(()=>replayAuthoredRelativeJointY({...expected,datum:{...expected.datum,rightBearingNodeId:'unmodeled'}},model,supplied),/Unmodeled/);
});
