import test from 'node:test';
import assert from 'node:assert/strict';
import {combineElasticFrameAuthoredActions as combine} from '../dist/analysis/src/elastic-frame-combine-authored-actions.js';

const node=(nodeId,fxLb,fyLb,momentLbIn)=>({nodeId,fxLb,fyLb,momentLbIn});
const uniform=(memberId,basis,qxLbPerIn,qyLbPerIn)=>({memberId,basis,qxLbPerIn,qyLbPerIn});
const point=(memberId,stationIn,fxLb,fyLb)=>({memberId,stationIn,fxLb,fyLb});

test('combines signed full vectors in first-seen order and keeps explicit zeroed rows',()=>{
  const terms=[
    {factor:2,loads:[node('B',4,-1,5),node('A',3,0,-1)],memberLoads:[uniform('AB','member-length',2,-3)],
      memberPointLoads:[point('AB',30,-1,4)]},
    {factor:-.5,loads:[node('B',16,-4,20),node('C',-2,4,6)],memberLoads:[uniform('AB','member-length',2,5),
      uniform('BC','horizontal-projection',-2,4)],memberPointLoads:[point('AB',30,-4,14)]},
  ];
  const before=JSON.stringify(terms);
  assert.deepEqual(combine(terms),{
    loads:[node('B',0,0,0),node('A',6,0,-2),node('C',1,-2,-3)],
    memberLoads:[uniform('AB','member-length',3,-8.5),uniform('BC','horizontal-projection',1,-2)],
    memberPointLoads:[point('AB',30,0,1)],
  });
  assert.equal(JSON.stringify(terms),before);
  assert.deepEqual(combine([{factor:2,loads:[],memberPointLoads:[point('BC',20,1,-1)]}]),{
    loads:[],memberPointLoads:[point('BC',20,2,-2)],
  });
});

test('rejects basis and exact station conflicts even if forces are signed to cancel',()=>{
  assert.throws(()=>combine([
    {factor:1,loads:[],memberLoads:[uniform('AB','member-length',3,2)]},
    {factor:-1,loads:[],memberLoads:[uniform('AB','horizontal-projection',3,2)]},
  ]),/conflicting uniform/i);
  assert.throws(()=>combine([
    {factor:1,loads:[],memberPointLoads:[point('AB',1,3,2)]},
    {factor:-1,loads:[],memberPointLoads:[point('AB',1+Number.EPSILON,3,2)]},
  ]),/conflicting point/i);
});

test('validates exact dense rows, duplicate IDs and representable signed products and accumulation',()=>{
  const explicit={factor:1,loads:[node('A',1,2,3)]};
  for(const altered of [{factor:0},{factor:Infinity},{factor:'2'},{loads:[,]},{loads:[]},
    {loads:[node('A',1,2,3),node('A',4,5,6)]},{loads:[{nodeId:'A',fxLb:1,fyLb:2}]},{memberLoads:undefined},
    {memberPointLoads:[point('AB',0,1,2)]},{memberLoads:[uniform('AB','self-weight',1,2)]}])
    assert.throws(()=>combine([{...explicit,...altered}]));
  const max={factor:1,loads:[node('A',Number.MAX_VALUE,0,0)]};
  assert.throws(()=>combine([{...max,factor:2}]),/weighted.*overflow/i);
  assert.throws(()=>combine([max,max]),/accumulation overflow/i);
  assert.throws(()=>combine([{factor:.25,loads:[node('A',Number.MIN_VALUE,0,0)]}]),/lost nonzero product/i);
  assert.deepEqual(combine([{factor:1,loads:[node('A',Number.MIN_VALUE,0,0)]}]).loads,[node('A',Number.MIN_VALUE,0,0)]);
  assert.deepEqual(combine([max,{...max,factor:-1}]).loads,[node('A',0,0,0)]);
});

test('preserves small signed residuals surrounded by canceling large terms in every channel',()=>{
  const terms=[1e16,1,-1e16].map(value=>({factor:1,loads:[node('A',value,-value,3*value)],
    memberLoads:[uniform('AB','member-length',value,-value)],
    memberPointLoads:[point('AB',30,-value,value)]}));
  assert.deepEqual(combine(terms),{
    loads:[node('A',1,-1,3)],
    memberLoads:[uniform('AB','member-length',1,-1)],
    memberPointLoads:[point('AB',30,-1,1)],
  });
});
