import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePinJointedTruss} from '../dist/analysis/src/index.js';
import {auditJointEquilibrium} from '../dist/analysis/src/joint-equilibrium.js';
const model={
 nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1e6},
 {id:'BC',a:'B',b:'C',areaIn2:2,elasticModulusPsi:1e6},
 {id:'AC',a:'A',b:'C',areaIn2:2,elasticModulusPsi:1e6}],
 loads:[{nodeId:'B',fyLb:-1000}],
 supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]
};
test('solved truss balances every individual joint',()=>{
 const result=analyzePinJointedTruss(model);
 const a=auditJointEquilibrium(model,result.axialForceLb,result.reactionLb);
 assert.equal(a.passes,true);
 assert.ok(a.maximumResidualLb<1e-5);
});
test('tampering internal member force fails local equilibrium',()=>{
 const result=analyzePinJointedTruss(model);
 const forces={...result.axialForceLb,AB:result.axialForceLb.AB+50};
 const a=auditJointEquilibrium(model,forces,result.reactionLb);
 assert.equal(a.passes,false);
 assert.ok(a.maximumResidualLb>40);
});
test('missing member force rejected',()=>{
 const result=analyzePinJointedTruss(model);
 assert.throws(()=>auditJointEquilibrium(model,{},result.reactionLb));
});
