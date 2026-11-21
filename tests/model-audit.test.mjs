import test from 'node:test';
import assert from 'node:assert/strict';
import {auditTrussModel,assertAuditedTrussModel} from '../dist/analysis/src/model-audit.js';
const base={
 nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1e6},
 {id:'BC',a:'B',b:'C',areaIn2:2,elasticModulusPsi:1e6},
 {id:'AC',a:'A',b:'C',areaIn2:2,elasticModulusPsi:1e6}],
 loads:[{nodeId:'B',fyLb:-1000}],
 supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]
};
test('triangular model passes preliminary topology audit',()=>{
 assert.equal(auditTrussModel(base).valid,true);
 assert.doesNotThrow(()=>assertAuditedTrussModel(base));
});
test('isolated node and insufficient stability are detected',()=>{
 const m={...base,nodes:[...base.nodes,{id:'D',x:300,y:100}]};
 const audit=auditTrussModel(m);
 assert.equal(audit.valid,false);
 assert.ok(audit.issues.some(i=>i.includes('Disconnected')));
 assert.throws(()=>assertAuditedTrussModel(m));
});
test('duplicate supports and missing endpoints rejected',()=>{
 const m={...base,supports:[...base.supports,base.supports[0]],bars:[...base.bars,{...base.bars[0],id:'BAD',b:'MISSING'}]};
 assert.equal(auditTrussModel(m).valid,false);
});
