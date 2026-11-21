import test from 'node:test';
import assert from 'node:assert/strict';
import {panelGravityNodalLoads} from '../dist/analysis/src/panel-loading.js';
const nodes=[{id:'A',x:0,y:0},{id:'B',x:120,y:40},{id:'C',x:240,y:80}];
test('unequal preliminary panel loads preserve total force',()=>{
 const l=panelGravityNodalLoads({nodes},{orderedTopChordNodeIds:['A','B','C'],panelPressurePsf:[10,30],trussSpacingFt:2});
 assert.deepEqual(l.map(x=>x.fyLb),[-100,-400,-300]);
 assert.equal(l.reduce((s,x)=>s+(x.fyLb??0),0),-800);
});
test('reject mismatch, negative pressure, and nonmonotone nodes',()=>{
 const base={orderedTopChordNodeIds:['A','B','C'],panelPressurePsf:[10,30],trussSpacingFt:2};
 assert.throws(()=>panelGravityNodalLoads({nodes},{...base,panelPressurePsf:[10]}));
 assert.throws(()=>panelGravityNodalLoads({nodes},{...base,panelPressurePsf:[10,-1]}));
 assert.throws(()=>panelGravityNodalLoads({nodes},{...base,orderedTopChordNodeIds:['B','A','C']}));
});
