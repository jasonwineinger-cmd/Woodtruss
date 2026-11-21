import test from 'node:test';
import assert from 'node:assert/strict';
import {roofGravityNodalLoads} from '../dist/analysis/src/loading.js';
const nodes=[{id:'L',x:0,y:0},{id:'Q',x:120,y:60},{id:'R',x:240,y:120}];
test('horizontal projection loading conserves total applied force',()=>{
 const loads=roofGravityNodalLoads({nodes},{topChordNodeIds:['L','Q','R'],roofPressurePsf:30,trussSpacingFt:2});
 assert.deepEqual(loads.map(l=>l.fyLb),[-300,-600,-300]);
 assert.equal(loads.reduce((sum,l)=>sum+l.fyLb,0),-1200);
});
test('invalid or unordered loading nodes rejected',()=>{
 assert.throws(()=>roofGravityNodalLoads({nodes},{topChordNodeIds:['Q','L'],roofPressurePsf:30,trussSpacingFt:2}));
 assert.throws(()=>roofGravityNodalLoads({nodes},{topChordNodeIds:['L','R'],roofPressurePsf:-1,trussSpacingFt:2}));
});
