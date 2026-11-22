import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewPreliminaryReportedLengthBudget as review }
  from '../dist/fabrication/src/preliminary-reported-length-budget.js';

const inch = 64;
const fixture = stockLengthTicks => ({
  stockRecordId:'synthetic-stock',stockLengthTicks,
  pieces:[{pieceRecordId:'first',lengthTicks:96*inch},{pieceRecordId:'second',lengthTicks:96*inch}],
  separators:[{separatorRecordId:'between',kerfTicks:16}],
  endTrims:{
    leading:{trimRecordId:'leading',offcutTicks:0,kerfTicks:16},
    trailing:{trimRecordId:'trailing',offcutTicks:0,kerfTicks:16},
  },
});

test('two nominal 96-inch pieces still need 48 ticks of separately reported kerfs',()=>{
  const nominal=192*inch;
  for(const [stockLengthTicks,marginTicks,balance] of [
    [nominal,-48,'nominal-short'],[nominal+47,-1,'nominal-short'],[nominal+48,0,'nominal-exact'],
  ]){
    const result=review(fixture(stockLengthTicks));
    assert.equal(result.status,'PRELIMINARY_REPORTED_LENGTH_BUDGET_ONLY');
    assert.deepEqual({
      stockLengthTicks:result.stockLengthTicks,pieceLengthTicks:result.pieceLengthTicks,
      separatorKerfTicks:result.separatorKerfTicks,endTrimOffcutTicks:result.endTrimOffcutTicks,
      endTrimKerfTicks:result.endTrimKerfTicks,requiredLengthTicks:result.requiredLengthTicks,
      marginTicks:result.marginTicks,balance:result.balance,
    }, {
      stockLengthTicks,pieceLengthTicks:12_288,separatorKerfTicks:16,endTrimOffcutTicks:0,
      endTrimKerfTicks:32,requiredLengthTicks:12_336,marginTicks,balance,
    });
    assert.equal(result.fabricationAuthorized,false);
    assert.equal(result.machineReleaseAuthorized,false);
  }
});

test('unequal authored end trims, offcuts and separator kerf are independent terms',()=>{
  const input=fixture(12_334);
  input.separators[0].kerfTicks=9;
  Object.assign(input.endTrims.leading,{offcutTicks:5,kerfTicks:7});
  Object.assign(input.endTrims.trailing,{offcutTicks:11,kerfTicks:13});
  const result=review(input);
  assert.equal(result.status,'PRELIMINARY_REPORTED_LENGTH_BUDGET_ONLY');
  assert.equal(result.pieceLengthTicks,12_288);
  assert.equal(result.separatorKerfTicks,9);
  assert.equal(result.endTrimKerfTicks,20);
  assert.equal(result.endTrimOffcutTicks,16);
  assert.equal(result.requiredLengthTicks,12_333);
  assert.equal(result.marginTicks,1);
  assert.equal(result.balance,'nominal-surplus');
  assert.equal(result.fabricationAuthorized,false);
  assert.equal(result.machineReleaseAuthorized,false);
});
