import test from 'node:test';
import assert from 'node:assert/strict';
import {analyticAxialBar} from '../dist/analysis/src/benchmarks.js';
import {analyzePinJointedTruss} from '../dist/analysis/src/index.js';
test('stiffness solver matches independent analytic axial deformation over sizes',()=>{
 for(const lengthIn of [12,120,600])for(const areaIn2 of [1.5,5.25,10]){
  const elasticModulusPsi=1e6,axialLoadLb=1000;
  const analytic=analyticAxialBar({lengthIn,areaIn2,elasticModulusPsi,axialLoadLb});
  const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:lengthIn,y:0}],
   bars:[{id:'AB',a:'A',b:'B',areaIn2,elasticModulusPsi}],
   loads:[{nodeId:'B',fxLb:axialLoadLb}],
   supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'B',fixX:false,fixY:true}]};
  const result=analyzePinJointedTruss(model);
  assert.ok(Math.abs(result.displacementIn.B.x-analytic.elongationIn)<1e-9);
  assert.ok(Math.abs(result.axialForceLb.AB-axialLoadLb)<1e-7);
 }
});
test('analytical benchmark rejects invalid properties',()=>{
 assert.throws(()=>analyticAxialBar({lengthIn:120,areaIn2:0,elasticModulusPsi:1e6,axialLoadLb:100}));
});
