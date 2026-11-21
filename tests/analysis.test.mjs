import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePinJointedTruss} from '../dist/analysis/src/index.js';
const close=(actual,expected,tol=1e-6)=>assert.ok(Math.abs(actual-expected)<tol,`${actual} differs from ${expected}`);
test('single horizontal bar has analytic elongation and reaction',()=>{
 const m={nodes:[{id:'A',x:0,y:0},{id:'B',x:100,y:0}],bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1000000}],loads:[{nodeId:'B',fxLb:1000}],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'B',fixX:false,fixY:true}]};
 const r=analyzePinJointedTruss(m);
 close(r.displacementIn.B.x,0.05);close(r.axialForceLb.AB,1000);close(r.reactionLb.A.x,-1000);close(r.residualForceLb,0);
});
test('symmetric two-bar triangular truss carries vertical point load',()=>{
 const m={nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1000000},{id:'BC',a:'B',b:'C',areaIn2:2,elasticModulusPsi:1000000},{id:'AC',a:'A',b:'C',areaIn2:2,elasticModulusPsi:1000000}],loads:[{nodeId:'B',fyLb:-1000}],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]};
 const r=analyzePinJointedTruss(m);
 close(r.reactionLb.A.y,500);close(r.reactionLb.C.y,500);
 close(r.axialForceLb.AB,-1000/Math.sqrt(2));close(r.axialForceLb.BC,-1000/Math.sqrt(2));
 close(r.residualForceLb,0);
});
test('singular mechanism is rejected',()=>{
 const m={nodes:[{id:'A',x:0,y:0},{id:'B',x:100,y:0}],bars:[{id:'AB',a:'A',b:'B',areaIn2:1,elasticModulusPsi:1000000}],loads:[],supports:[{nodeId:'A',fixX:true,fixY:true}]};
 assert.throws(()=>analyzePinJointedTruss(m),/singular|Unstable/);
});
