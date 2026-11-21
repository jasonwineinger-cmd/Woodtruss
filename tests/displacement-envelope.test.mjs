import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePinJointedTruss} from '../dist/analysis/src/index.js';
import {envelopeJointDisplacements} from '../dist/analysis/src/displacement-envelope.js';
const base={
 nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1e6},
 {id:'BC',a:'B',b:'C',areaIn2:2,elasticModulusPsi:1e6},
 {id:'AC',a:'A',b:'C',areaIn2:2,elasticModulusPsi:1e6}],
 supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}],
 loads:[]
};
const make=(id,fy)=>{const model={...base,loads:[{nodeId:'B',fyLb:fy}]};return {id,model,result:analyzePinJointedTruss(model)}};
test('envelopes positive and negative joint translations',()=>{
 const e=envelopeJointDisplacements([make('gravity',-1000),make('uplift',500)]);
 assert.equal(e.joints.B.y.governingAbsoluteCase,'gravity');
 assert.ok(e.joints.B.y.minIn<0);
 assert.ok(e.joints.B.y.maxIn>0);
 assert.ok(e.joints.B.magnitude.maximumAbsoluteIn>0);
 assert.equal(e.status,'PRELIMINARY_NOT_ENGINEERED');
});
test('rejects incompatible stiffness and duplicate cases',()=>{
 const a=make('gravity',-1000);
 const b=make('uplift',500);
 b.model.bars=[{...b.model.bars[0],areaIn2:3},...b.model.bars.slice(1)];
 assert.throws(()=>envelopeJointDisplacements([a,b]));
 assert.throws(()=>envelopeJointDisplacements([a,a]));
});
