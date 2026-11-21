import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePinJointedTruss} from '../dist/analysis/src/index.js';
import {auditGlobalEquilibrium} from '../dist/analysis/src/equilibrium.js';
const model={
 nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1000000},
       {id:'BC',a:'B',b:'C',areaIn2:2,elasticModulusPsi:1000000},
       {id:'AC',a:'A',b:'C',areaIn2:2,elasticModulusPsi:1000000}],
 loads:[{nodeId:'B',fyLb:-1000}],
 supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]
};
test('independent equilibrium audit checks forces and moments',()=>{
 const result=analyzePinJointedTruss(model);
 const audit=auditGlobalEquilibrium(model,result);
 assert.equal(audit.passes,true);
 assert.ok(Math.abs(audit.sumFxLb)<1e-5);
 assert.ok(Math.abs(audit.sumFyLb)<1e-5);
 assert.ok(Math.abs(audit.sumMomentAboutOriginLbIn)<1e-3);
});
test('tampered reaction fails equilibrium audit',()=>{
 const result=analyzePinJointedTruss(model);
 const tampered={...result,reactionLb:{...result.reactionLb,C:{...result.reactionLb.C,y:result.reactionLb.C.y+10}}};
 assert.equal(auditGlobalEquilibrium(model,tampered).passes,false);
});
test('negative tolerance rejected',()=>{
 assert.throws(()=>auditGlobalEquilibrium(model,analyzePinJointedTruss(model),-1));
});
