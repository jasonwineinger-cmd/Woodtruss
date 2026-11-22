import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotElasticFrameReviewData as snapshot} from '../dist/analysis/src/elastic-frame-reviewed-plain-data.js';

test('detaches and recursively freezes JSON values, canonicalizes keys, and preserves authored array order',()=>{
  const shared={z:4,a:-0};
  const input={z:shared,'10':1,'2':2,a:[4,2,shared],m:true,n:null};
  const result=snapshot(input);
  assert.equal(JSON.stringify(result),'{"2":2,"10":1,"a":[4,2,{"a":0,"z":4}],"m":true,"n":null,"z":{"a":0,"z":4}}');
  assert.deepEqual(Object.keys(result),['2','10','a','m','n','z']);
  assert.equal(Object.getPrototypeOf(result),null);
  assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.a)&&Object.isFrozen(result.a[2]));
  assert.notEqual(result.z,result.a[2]);
  assert.ok(Object.is(result.z.a,0));
  shared.z=22;
  assert.equal(result.z.z,4);
});

test('never invokes getters or toJSON; rejects hidden, symbol and non-JSON values',()=>{
  let calls=0;
  const getter=Object.defineProperty({},'x',{enumerable:true,get(){calls++;return 1;}});
  const method={toJSON(){calls++;return {};}};
  const arrayGetter=Object.defineProperty([1],0,{enumerable:true,get(){calls++;return 1;}});
  for(const input of [getter,method,arrayGetter,Object.defineProperty({},'x',{value:1}),{[Symbol('x')]:1},
    {x:undefined},{x:NaN},{x:Infinity},12n,new Date(0),new Number(1),new Map()])
    assert.throws(()=>snapshot(input),/Invalid elastic frame review plain data/);
  assert.equal(calls,0);
  assert.equal(JSON.stringify(snapshot(JSON.parse('{"__proto__":{"value":2},"toJSON":"text"}'))),
    '{"__proto__":{"value":2},"toJSON":"text"}');
});

test('rejects cycles, arrays with holes or extras, and bounded depth/size exhaustion',()=>{
  const cycle={}; cycle.item=[cycle];
  const extra=[1];extra.note='x';
  const symbolExtra=[1];symbolExtra[Symbol('x')]='x';
  let deep=null;
  for(let i=0;i<70;i++)deep={child:deep};
  for(const input of [cycle,new Array(2),extra,symbolExtra,deep,new Array(250_001)])
    assert.throws(()=>snapshot(input),/Invalid elastic frame review plain data/);
});

test('bounds aggregate key and value text before canonical serialization',()=>{
  const large='x'.repeat(4_000_001);
  assert.throws(()=>snapshot({[large]:large}),/text budget exceeded/);
});
