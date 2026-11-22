import test from 'node:test';
import assert from 'node:assert/strict';
import { countMaximumReportedStockCoverage as count } from '../dist/lumber/src/reported-stock-coverage-count.js';

// Exhaustively enumerate skip and every available eligible stock row for
// each distinct member slot. No matching/flow algorithm shared with the helper.
function brute({availablePieces,eligibleStockIndices}) {
  const left=[...availablePieces];
  function visit(index){
    if(index===eligibleStockIndices.length) return 0;
    let best=visit(index+1);
    for(const stock of eligibleStockIndices[index]){
      if(left[stock]===0) continue;
      --left[stock];
      best=Math.max(best,1+visit(index+1));
      ++left[stock];
    }
    return best;
  }
  return visit(0);
}
function frozen(availablePieces,eligibleStockIndices){
  return Object.freeze({
    availablePieces:Object.freeze(availablePieces),
    eligibleStockIndices:Object.freeze(eligibleStockIndices.map(row=>Object.freeze(row))),
  });
}

test('count reroutes a flexible first member rather than consuming the sole restricted option',()=>{
  const trap=frozen([1,1],[[0,1],[0]]);
  assert.equal(brute(trap),2);
  assert.equal(count(trap),2);
  assert.equal(count(frozen([2,1],[[0],[0],[0],[1],[]])),3);
});

test('seeded bounded count agrees with exhaustive member-slot enumeration',()=>{
  let seed=0x8d6802bd;
  const rand=n=>{
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return Math.floor(seed*n/2**32);
  };
  for(let k=0;k<360;k++){
    const n=1+rand(6), m=1+rand(8);
    const input=frozen(Array.from({length:n},()=>rand(4)),
      Array.from({length:m},()=>Array.from({length:n},(_,i)=>i).filter(()=>rand(4)<2)));
    assert.equal(count(input),brute(input),`seeded case ${k}`);
  }
});

test('sparse cover reaches all 250 members using distinct stocked rows',()=>{
  const capacity=Array(500).fill(0);
  for(let i=0;i<250;i++) capacity[2*i]=1;
  const rows=Array.from({length:250},(_,i)=> i===249 ? [0] : [2*i,2*i+2,2*i+1]);
  // Give member 249 slot 0 and each earlier member slot 2*i+2:
  // this covers all members and no optimum can exceed their number.
  assert.equal(count(frozen(capacity,rows)),250);
});
