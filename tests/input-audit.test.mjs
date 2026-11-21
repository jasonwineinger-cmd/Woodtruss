import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAnalysisInputs} from '../dist/analysis/src/input-audit.js';
import {auditTrussModel} from '../dist/analysis/src/model-audit.js';
const base={
 nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1e6},
 {id:'BC',a:'B',b:'C',areaIn2:2,elasticModulusPsi:1e6},
 {id:'AC',a:'A',b:'C',areaIn2:2,elasticModulusPsi:1e6}],
 loads:[],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]
};
test('analysis inputs reject invalid coordinates and forces',()=>{
 assert.equal(auditAnalysisInputs(base).valid,true);
 assert.equal(auditAnalysisInputs({...base,nodes:[{...base.nodes[0],x:NaN},...base.nodes.slice(1)]}).valid,false);
 assert.equal(auditAnalysisInputs({...base,loads:[{nodeId:'B',fyLb:Infinity}]}).valid,false);
});
test('model audit rejects duplicate physical members even with unique IDs',()=>{
 const duplicate={...base,bars:[...base.bars,{...base.bars[0],id:'BA',a:'B',b:'A'}]};
 assert.equal(auditTrussModel(duplicate).valid,false);
 assert.ok(auditTrussModel(duplicate).issues.some(s=>s.includes('Duplicate physical member')));
});
