import test from 'node:test';
import assert from 'node:assert/strict';
import {selectElasticFrameStressCases as select} from '../dist/analysis/src/elastic-frame-stress-case-selection.js';

const row=(stationIn,side,normalStressPsi,axialLb,shearLb,momentLbIn)=>
  ({stationIn,side,normalStressPsi,axialLb,shearLb,momentLbIn});
const cases=[
  {caseId:'first',memberRectangularStressExtrema:{AB:{
    positiveDepth:{min:row(7,'left',-100,-22,13,70),max:row(10,'continuous',25,19,-7,8)},
    negativeDepth:{min:row(4,'continuous',-35,9,2,8),max:row(9,'right',75,17,9,30)},
  }}},
  {caseId:'second',memberRectangularStressExtrema:{AB:{
    positiveDepth:{min:row(7,'right',-100,-12,-3,65),max:row(11,'continuous',40,23,-4,15)},
    negativeDepth:{min:row(4,'continuous',-50,-36,2,10),max:row(10,'continuous',60,15,6,35)},
  }}},
];

test('preserves full governing rows and first authored case for an exact stress tie',()=>{
  const out=select(cases,['AB']).AB;
  for(const [face,limit,k] of [
    ['positiveDepth','min',0],['positiveDepth','max',1],['negativeDepth','min',1],['negativeDepth','max',0],
  ]){
    assert.deepEqual(out[face][limit],{caseId:cases[k].caseId,...cases[k].memberRectangularStressExtrema.AB[face][limit]});
  }
  const reverse=select([...cases].reverse(),['AB']).AB;
  assert.equal(reverse.positiveDepth.min.caseId,'second');
  assert.equal(reverse.positiveDepth.min.side,'right');
  assert.equal(cases[0].memberRectangularStressExtrema.AB.positiveDepth.min.caseId,undefined);
});

test('requires exactly the requested unique members in each unique named case',()=>{
  assert.throws(()=>select([],['AB']),/explicit unique/i);
  assert.throws(()=>select(cases,['AB','AB']),/explicit unique/i);
  assert.throws(()=>select([cases[0],cases[0]],['AB']),/repeated/i);
  assert.throws(()=>select(cases,['AB','BC']),/member set/i);
  assert.throws(()=>select([{...cases[0],memberRectangularStressExtrema:{...cases[0].memberRectangularStressExtrema,BC:{}}}],['AB']),/member set/i);
});

test('rejects nonfinite fields, invalid one-sided cuts, reversed limits, and inconsistent coincident actions',()=>{
  function altered(edit){
    const item=structuredClone(cases[0]);
    edit(item.memberRectangularStressExtrema.AB);
    return [item];
  }
  assert.throws(()=>select(altered(m=>{m.positiveDepth.min.normalStressPsi=NaN;}),['AB']),/invalid coincident/i);
  assert.throws(()=>select(altered(m=>{m.positiveDepth.min.side='auto';}),['AB']),/invalid coincident/i);
  assert.throws(()=>select(altered(m=>{m.positiveDepth.min.normalStressPsi=90;}),['AB']),/inconsistent/i);
  assert.throws(()=>select(altered(m=>{const a=m.positiveDepth.min; m.negativeDepth.min={...a,axialLb:a.axialLb+1};}),['AB']),/disagree/i);
});

test('consumes only known preliminary solver metadata; it cannot launder release or strength fields',()=>{
  const item=structuredClone(cases[0]);
  const row=item.memberRectangularStressExtrema.AB;
  Object.assign(row,{status:'PRELIMINARY_NOT_ENGINEERED',fabricationAuthorized:false});
  assert.equal(select([item],['AB']).AB.positiveDepth.min.caseId,item.caseId);
  row.fabricationAuthorized=true;
  assert.throws(()=>select([item],['AB']),/stress faces/i);
  row.fabricationAuthorized=false;
  row.capacityPsi=2100;
  assert.throws(()=>select([item],['AB']),/stress faces/i);
});
