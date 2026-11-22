import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewPreliminaryReportedLengthBudget as review }
  from '../dist/fabrication/src/preliminary-reported-length-budget.js';

const fixture = () => ({
  stockRecordId: 'PRIVATE stock record',
  stockLengthTicks: 15143,
  pieces: [{pieceRecordId:'PRIVATE piece A',lengthTicks:3211},{pieceRecordId:'PRIVATE piece B',lengthTicks:4193}],
  separators: [{separatorRecordId:'PRIVATE separator',kerfTicks:153}],
  endTrims: {
    leading: {trimRecordId:'PRIVATE leading',offcutTicks:211,kerfTicks:157},
    trailing: {trimRecordId:'PRIVATE trailing',offcutTicks:0,kerfTicks:0},
  },
});

function held(result) {
  assert.equal(result.status,'HOLD_PRELIMINARY_REPORTED_LENGTH_BUDGET');
  assert.equal(result.fabricationAuthorized,false);
  assert.equal(result.machineReleaseAuthorized,false);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|15143|3211|4193|getter executed/iu);
}

test('holds missing, ambiguous or unexpected ledger rows without returning supplied data', () => {
  for (const mutate of [
    row=>{delete row.endTrims.leading;},
    row=>{delete row.endTrims.trailing.kerfTicks;},
    row=>{delete row.separators;},
    row=>{row.separators=[];},
    row=>{row.separators.push({separatorRecordId:'PRIVATE extra separator',kerfTicks:17});},
    row=>{row.pieces=[];},
    row=>{delete row.pieces[0];},
    row=>{row.pieces[0].pieceRecordId=row.stockRecordId;},
    row=>{row.pieces[1].pieceRecordId=row.pieces[0].pieceRecordId;},
    row=>{row.separators[0].separatorRecordId=row.pieces[0].pieceRecordId;},
    row=>{row.endTrims.trailing.trimRecordId=row.endTrims.leading.trimRecordId;},
    row=>{row.endTrims.leading.trimRecordId=row.separators[0].separatorRecordId;},
    row=>{row.remainingTicks=10;},
    row=>{row.endTrims.trailing.machineReleaseAuthorized=true;},
    row=>{Object.defineProperty(row.pieces[0],'hidden',{value:5});},
    row=>{row[Symbol('extra')]=true;},
  ]) {
    const input=fixture(); mutate(input); held(review(input));
  }
});

test('requires safe integer tick amounts with explicit nonnegative trims and positive pieces and separators', () => {
  for (const mutate of [
    row=>{row.stockLengthTicks=0;},
    row=>{row.stockLengthTicks=Number.MAX_SAFE_INTEGER+1;},
    row=>{row.pieces[0].lengthTicks=0;},
    row=>{row.pieces[0].lengthTicks=1.5;},
    row=>{row.pieces[0].lengthTicks=Infinity;},
    row=>{row.pieces[0].lengthTicks='3211';},
    row=>{row.separators[0].kerfTicks=0;},
    row=>{row.separators[0].kerfTicks=NaN;},
    row=>{row.endTrims.leading.offcutTicks=-1;},
    row=>{row.endTrims.trailing.kerfTicks=-1;},
    row=>{row.endTrims.trailing.offcutTicks=Number.MAX_SAFE_INTEGER+1;},
  ]) {
    const input=fixture(); mutate(input); held(review(input));
  }
});

test('holds accessor-bearing inputs without invoking getters or exposing raw errors', () => {
  let reads=0;
  const getter=()=>{reads++;throw new Error('getter executed with PRIVATE data');};
  for (const [parent, field] of [
    [row=>row,'stockRecordId'], [row=>row.pieces[0],'lengthTicks'],
    [row=>row.separators[0],'kerfTicks'], [row=>row.endTrims.trailing,'trimRecordId'],
  ]) {
    const input=fixture();
    Object.defineProperty(parent(input),field,{enumerable:true,get:getter});
    held(review(input));
  }
  assert.equal(reads,0);
});
