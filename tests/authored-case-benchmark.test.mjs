import test from 'node:test';
import assert from 'node:assert/strict';
import {captureAuthoredCase} from '../dist/analysis/src/authored-case-replay.js';
import {compareAuthoredCaseBenchmark} from '../dist/analysis/src/authored-case-benchmark.js';

const scope={caseId:'named-synthetic',description:'Artificial QA fixture',modelId:'numerical-fixture',modelRevision:'R7'};
const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:48,y:30},{id:'C',x:144,y:0}],
 bars:[['A','B'],['B','C'],['A','C']].map(([a,b])=>({id:a+b,a,b,areaIn2:2,elasticModulusPsi:1e6})),
 loads:[],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]};
const channels=[{id:'source',provenance:'Synthetic independent fixture declaration',loads:[{nodeId:'B',fyLb:-120}]}];
const receipt=captureAuthoredCase(scope,model,channels);
const obs=(checkId,targetId,expectedValue,quantity='support-reaction-y',unit='lb')=>({
 checkId,targetId,expectedValue,quantity,unit,absoluteTolerance:1e-8,sourceReference:'Synthetic hand sum of forces and moments'});
const run=(observations)=>compareAuthoredCaseBenchmark({scope,observations},receipt,model,channels);

test('checks authored known support reactions against actual independently solved values',()=>{
 const result=run([obs('left','A',80),obs('right','C',40)]);
 assert.equal(result.allExpectedValuesMatched,true);
 assert.equal(result.manufacturingApproved,false);
 assert.deepEqual(result.scope,scope);
 assert.ok(Math.abs(result.observations[1].actualValue-40)<1e-8);
 assert.equal(result.observations[0].outcome,'MATCHES_AUTHORED_EXPECTATION');
});

test('separates genuine numeric discrepancy, unsupported quantity, missing restraint and wrong units',()=>{
 const result=run([obs('numeric','A',79),obs('unsupported','A',80,'contact'),
  obs('missing','B',0),obs('units','C',40,'support-reaction-y','in')]);
 assert.deepEqual(result.observations.map(row=>row.outcome),['NUMERICAL_MISMATCH',
  'HELD_UNSUPPORTED_QUANTITY','HELD_MISSING_MODELED_RESULT','HELD_UNIT_MISMATCH']);
 assert.ok(Math.abs(result.observations[0].signedDifference-1)<1e-8);
 assert.equal(result.observations[1].actualValue,null);
 assert.equal(result.allExpectedValuesMatched,false);
});

test('rejects stale revision, same-ID edited inputs, and incomplete metrology',()=>{
 const observations=[obs('left','A',80)];
 assert.throws(()=>compareAuthoredCaseBenchmark({scope:{...scope,modelRevision:'R6'},observations},
  receipt,model,channels),/stale/);
 const altered=structuredClone(model);altered.nodes[1].x++;
 assert.throws(()=>compareAuthoredCaseBenchmark({scope,observations},receipt,altered,channels),/model inputs changed/);
 assert.throws(()=>run([observations[0],observations[0]]),/complete and unique/);
 assert.throws(()=>run([{...observations[0],sourceReference:''}]),/complete and unique/);
});
