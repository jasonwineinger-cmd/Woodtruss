import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateExplicitNodalLoadChannels} from '../dist/analysis/src/load-source-aggregation.js';
import {analyzePinJointedTruss} from '../dist/analysis/src/index.js';

const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1e6},
 {id:'BC',a:'B',b:'C',areaIn2:2,elasticModulusPsi:1e6},
 {id:'AC',a:'A',b:'C',areaIn2:2,elasticModulusPsi:1e6}],
 loads:[{nodeId:'B',fyLb:9999}],
 supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]};
const one={id:'component-a',provenance:'synthetic worksheet A',loads:[{nodeId:'C',fyLb:25},{nodeId:'B',fxLb:100,fyLb:-1100}]};
const two={id:'component-b',provenance:'synthetic worksheet B',loads:[{nodeId:'B',fxLb:-100,fyLb:100},{nodeId:'C',fyLb:-25}]};

test('keeps signed cancellation, model ordering and individual provenance with no implicit base load',()=>{
 const channels=structuredClone([one,two]);
 const expected=JSON.stringify(channels);
 const out=aggregateExplicitNodalLoadChannels(model,channels);
 assert.equal(JSON.stringify(channels),expected);
 assert.equal(out.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.deepEqual(out.jointLoads,[{nodeId:'B',fxLb:0,fyLb:-1000},{nodeId:'C',fxLb:0,fyLb:0}]);
 assert.deepEqual(out.contributions,[{...one,loads:[{nodeId:'C',fxLb:0,fyLb:25},one.loads[1]]},
  {...two,loads:[two.loads[0],{nodeId:'C',fxLb:0,fyLb:-25}]}]);
 channels[0].loads[0].fyLb=800;
 assert.equal(out.contributions[0].loads[0].fyLb,25);
 const result=analyzePinJointedTruss({...model,loads:out.jointLoads});
 for(const support of ['A','C'])assert.ok(Math.abs(result.reactionLb[support].y-500)<1e-8);
 assert.ok(Math.abs(result.axialForceLb.AC-500)<1e-8);
});

test('rejects unbound, duplicate, missing and nonfinite authored inputs',()=>{
 for(const [channels,error] of [
  [[],/At least one/],
  [[one,one],/Duplicate load channel/],
  [[{...one,id:' component-a'}],/Channel ID/],
  [[{...one,provenance:''}],/provenance/],
  [[{...one,loads:[]}],/requires explicit joint/],
  [[{...one,loads:[{nodeId:'unknown',fyLb:1}]}],/Unknown channel joint/],
  [[{...one,loads:[one.loads[0],one.loads[0]]}],/Duplicate joint/],
  [[{...one,loads:[{nodeId:'A',fxLb:Infinity}]}],/Nonfinite/],
  [[{...one,loads:[{nodeId:'A',fxLb:null}]}],/Nonfinite/],
  [[{...one,loads:[{nodeId:'A',fxLb:Number.MAX_VALUE}]},
    {...two,loads:[{nodeId:'A',fxLb:Number.MAX_VALUE}]}],/overflow/],
 ])assert.throws(()=>aggregateExplicitNodalLoadChannels(model,channels),error);
 assert.throws(()=>aggregateExplicitNodalLoadChannels({nodes:[...model.nodes,model.nodes[0]]},[one]),/duplicate modeled node/);
});
