import test from 'node:test';
import assert from 'node:assert/strict';
import { stockParetoFrontierOfferIds as frontier } from '../dist/lumber/src/stock-pareto-sweep.js';

function direct(rows) {
  return rows.filter(a => !rows.some(b =>
    b.areaIn2 <= a.areaIn2 && b.unusedLengthIn <= a.unusedLengthIn &&
    (b.areaIn2 < a.areaIn2 || b.unusedLengthIn < a.unusedLengthIn),
  )).map(row => row.offerId);
}

function generator(seed) {
  return (n) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor(seed * n / 2**32);
  };
}
const sample = (offerId, areaIn2, unusedLengthIn) => Object.freeze({offerId,areaIn2,unusedLengthIn});

test('stock Pareto sweep agrees with direct pairwise dominance in input order', () => {
  const rand = generator(0x777ab991);
  const datasets = [[], [sample('only',1,0)], [
    sample('equal first',3,1), sample('wider',4,1), sample('equal last',3,1),
    sample('less area',1,2), sample('worse on same area',3,2),
  ]];
  for (let i=0; i<400; i++){
    const rows=[];
    const len=rand(65);
    for(let j=0; j<len; j++){
      const division = i%3===0 ? 1 : i%3===1 ? 8 : 32;
      const range = i%4===0 ? 4 : 75;
      rows.push(sample(`offer-${i}-${len-j}`,(1+rand(range))/division,rand(range)/division));
    }
    datasets.push(rows);
  }
  for(const [i,rows] of datasets.entries()){
    Object.freeze(rows);
    assert.deepEqual(frontier(rows),direct(rows),`seeded dataset ${i}`);
  }
});

test('large exact antichain keeps all offers and tied pairs in original scrambled order', () => {
  const count=20011;
  const rows=Object.freeze(Array.from({length:count},(_,j)=>{
    const n=j*97%count;
    return sample(`large-${j}`,1+n,count-1-n);
  }).flatMap((row,j)=>j%4000===0 ?
    [row,sample(`duplicate-objectives-${j}`,row.areaIn2,row.unusedLengthIn)] : [row]));
  // Opposing slopes imply a strict improvement on one axis always worsens the other.
  assert.deepEqual(frontier(rows),rows.map(row=>row.offerId));
});
