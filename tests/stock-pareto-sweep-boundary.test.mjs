import assert from 'node:assert/strict';
import test from 'node:test';
import {stockParetoFrontierOfferIds as frontier} from '../dist/lumber/src/stock-pareto-sweep.js';

const row=(offerId,areaIn2,unusedLengthIn)=>({offerId,areaIn2,unusedLengthIn});

test('returns the nondominated IDs in caller order, retaining objective ties only while nondominated',()=>{
  const offers=Object.freeze([
    row('tradeoff-high-area',8,0),
    row('dominated-same-area',2,8),
    row('tradeoff-tie-second-name',4,3),
    row('dominated-same-unused-a',6,3),
    row('smallest-area',2,5),
    row('dominated-same-unused-b',6,3),
    row('tradeoff-tie-first-name',4,3),
    row('dominated-zero-unused',9,0),
  ].map(Object.freeze));
  const before=structuredClone(offers);
  const out=frontier(offers);
  assert.deepEqual(out,['tradeoff-high-area','tradeoff-tie-second-name','smallest-area','tradeoff-tie-first-name']);
  assert.deepEqual(offers,before);
  assert.deepEqual(frontier([...offers].reverse()),[...out].reverse());
  assert.deepEqual(frontier([]),[]);
  assert.deepEqual(frontier([row('singleton',1,0)]),['singleton']);
});

test('rejects invalid or duplicate rows even after a dominating offer is encountered',()=>{
  const best=row('valid',1,0);
  const invalid=[
    row('valid',20,20),row('',20,20),row(' ',20,20),row(7,20,20),
    row('bad-area',0,0),row('bad-area',-1,0),row('bad-area',NaN,0),
    row('bad-area',Infinity,0),row('bad-area','20',0),
    row('bad-unused',20,-1),row('bad-unused',20,NaN),row('bad-unused',20,Infinity),
    row('bad-unused',20,'0'),row('missing-unused',20,undefined),
    null,undefined,
  ];
  for(const item of invalid) assert.throws(()=>frontier([best,item]),Error);
  assert.throws(()=>frontier([best,,]),Error);
  assert.throws(()=>frontier({0:best,length:1}),Error);
});
