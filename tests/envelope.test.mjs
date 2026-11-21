import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePinJointedTruss} from '../dist/analysis/src/index.js';
import {envelopePreliminaryCases} from '../dist/analysis/src/envelope.js';
const base={
 nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1e6},{id:'BC',a:'B',b:'C',areaIn2:2,elasticModulusPsi:1e6},{id:'AC',a:'A',b:'C',areaIn2:2,elasticModulusPsi:1e6}],
 loads:[],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]
};
const make=(id,fy)=>{const model={...base,loads:[{nodeId:'B',fyLb:fy}]};return {id,model,result:analyzePinJointedTruss(model)}};
test('envelope tracks both tension and compression with governing cases',()=>{
 const envelope=envelopePreliminaryCases([make('gravity',-1000),make('uplift',500)]);
 assert.equal(envelope.memberForces.AB.governingMinCase,'gravity');
 assert.equal(envelope.memberForces.AB.governingMaxCase,'uplift');
 assert.ok(envelope.memberForces.AB.minLb<0);
 assert.ok(envelope.memberForces.AB.maxLb>0);
 assert.equal(envelope.status,'PRELIMINARY_NOT_ENGINEERED');
});
test('duplicate case identifiers and changed member properties rejected',()=>{
 const a=make('case',-1000),b=make('case',500);
 assert.throws(()=>envelopePreliminaryCases([a,b]));
 const changed=make('other',500);
 changed.model.bars=[{...base.bars[0],areaIn2:3},...base.bars.slice(1)];
 assert.throws(()=>envelopePreliminaryCases([a,changed]));
});
