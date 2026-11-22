import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewPreliminaryReportedLengthBudget as review }
  from '../dist/fabrication/src/preliminary-reported-length-budget.js';

const fixture = (n, stockLengthTicks) => ({
  stockRecordId:'synthetic-reported-row',stockLengthTicks,
  pieces:Array.from({length:n},(_,i)=>({pieceRecordId:`part-${i}`,lengthTicks:1})),
  separators:Array.from({length:n-1},(_,i)=>({separatorRecordId:`separator-${i}`,kerfTicks:1})),
  endTrims:{leading:{trimRecordId:'leading',offcutTicks:0,kerfTicks:0},
    trailing:{trimRecordId:'trailing',offcutTicks:0,kerfTicks:0}},
});

test('the sole piece has no separator but both separately reported end losses still count',()=>{
  const single=fixture(1,12);
  Object.assign(single.endTrims.leading,{offcutTicks:4,kerfTicks:2});
  Object.assign(single.endTrims.trailing,{offcutTicks:3,kerfTicks:2});
  const result=review(single);
  assert.equal(result.status,'PRELIMINARY_REPORTED_LENGTH_BUDGET_ONLY');
  assert.deepEqual([result.separatorKerfTicks,result.endTrimOffcutTicks,result.endTrimKerfTicks,
    result.requiredLengthTicks,result.marginTicks,result.balance],[0,7,4,12,0,'nominal-exact']);
  for(const key of ['reportedInventoryIndependentlyVerified','inventoryAllocated','physicalTrimVerified',
    'approvedForStructuralUse','engineeringApproved','fabricationAuthorized','machineReleaseAuthorized',
    'shippingAuthorized']) assert.equal(result[key],false,key);
});

test('row count and aggregate integer bounds hold without hiding a one-tick deficit',()=>{
  const max=Number.MAX_SAFE_INTEGER;
  const almost=fixture(1,max-1);
  almost.pieces[0].lengthTicks=max-1;
  almost.endTrims.trailing.kerfTicks=1;
  const result=review(almost);
  assert.equal(result.requiredLengthTicks,max);
  assert.equal(result.marginTicks,-1);
  almost.endTrims.trailing.offcutTicks=1;
  assert.equal(review(almost).status,'HOLD_PRELIMINARY_REPORTED_LENGTH_BUDGET');
  const atCap=review(fixture(1024,2047));
  assert.equal(atCap.marginTicks,0);
  assert.deepEqual(review(fixture(1025,2049)),review(almost));
});
