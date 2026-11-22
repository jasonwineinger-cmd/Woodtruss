import test from 'node:test';
import assert from 'node:assert/strict';
import {comparePreliminaryAxialBarObservations as compare} from '../dist/lumber/src/index.js';

const base={studyId:'synthetic-bar',datumId:'fixture-zero',lengthIn:100,areaIn2:2,longitudinalModulusPsi:1000};
const observation=(observationId,forceLb,observedLengthChangeIn,allowedDifferenceIn=0.125,datumId=base.datumId)=>
  ({observationId,datumId,forceLb,observedLengthChangeIn,allowedDifferenceIn});

test('compares signed first-order change against an explicit tolerance without fitting the modulus',()=>{
  const report=compare({...base,observations:[
    observation('pull',20,1),observation('push',-40,-2.125),observation('wrong-sign',20,-1),
    observation('zero',0,0,0),
  ]});
  assert.equal(report.stiffnessLbPerIn,20);
  assert.deepEqual(report.comparisons.map(row=>[row.predictedLengthChangeIn,row.differenceIn,row.comparisonStatus]),[
    [1,0,'WITHIN_SUPPLIED_TOLERANCE'],[-2,-0.125,'WITHIN_SUPPLIED_TOLERANCE'],
    [1,-2,'OUTSIDE_SUPPLIED_TOLERANCE'],[0,0,'WITHIN_SUPPLIED_TOLERANCE'],
  ]);
  assert.equal(report.section.longitudinalModulusPsi,1000);
  assert.equal(report.observedDataIndependentlyVerified,false);
  assert.equal(report.approvedForStructuralUse,false);
});

test('keeps a wrong or missing displacement datum out of the comparable set',()=>{
  const rows=compare({...base,observations:[
    observation('first',20,1,0.125,'other-zero'),
    {...observation('second',-20,-1),datumId:undefined},
  ]}).comparisons;
  for(const row of rows) {
    assert.equal(row.comparisonStatus,'HOLD_DATUM_MISMATCH');
    assert.equal(row.predictedLengthChangeIn,null);
    assert.equal(row.differenceIn,null);
  }
});

test('rejects no threshold, duplicate IDs and nonfinite geometry, force or observations',()=>{
  const yes=observation('yes',20,1);
  for(const observations of [[],Array(1),[yes,yes],[{...yes,allowedDifferenceIn:undefined}],
    [{...yes,allowedDifferenceIn:-0.1}],[{...yes,forceLb:Infinity}],[{...yes,observedLengthChangeIn:NaN}]])
    assert.throws(()=>compare({...base,observations}));
  assert.throws(()=>compare({...base,longitudinalModulusPsi:undefined,observations:[yes]}));
});
