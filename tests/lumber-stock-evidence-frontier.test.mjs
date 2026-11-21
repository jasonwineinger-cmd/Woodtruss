import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewPreliminaryStockWithCaseEvidence} from '../dist/lumber/src/index.js';

// Explicitly synthetic evidence. No code cases, real grades or published values.
const row=(referenceValueId,actualDepthIn)=>({referenceValueId,speciesGroup:'synthetic',grade:'fixture-grade',
  nominalSize:'fixture-size',actualWidthIn:2,actualDepthIn,referenceEdition:'fixture-edition',
  referencePublisher:'fixture-publisher',referenceTable:'fixture-table',
  fbPsi:101,ftPsi:102,fcPsi:103,fvPsi:104,ePsi:202,eMinPsi:201});
const catalog={catalogId:'fixture',records:[row('small',3),row('large',4)]};
const offers=[{offerId:'first',referenceValueId:'small',stockLengthIn:80,availablePieces:1,stockRecordId:'A'},
  {offerId:'second',referenceValueId:'large',stockLengthIn:82,availablePieces:1,stockRecordId:'B'}];
const needs=[{memberId:'chord',schematicRecordId:'schematic-rev-1',memberLengthIn:80,addedLengthIn:0,
  allowedReferenceValueIds:['small','large'],maxWidthIn:2,maxDepthIn:4}];
const requiredCases=[{caseId:'synthetic-A',basisId:'case-a-rev-1'},{caseId:'synthetic-B',basisId:'case-b-rev-1'}];
const expectations=[{memberId:'chord',schematicRecordId:'schematic-rev-1',requiredCases}];
const receipt=(index)=>({
  ...expectations[0],offerId:offers[index].offerId,stockRecordId:offers[index].stockRecordId,
  reportedStockLengthIn:offers[index].stockLengthIn,catalogId:catalog.catalogId,
  reference:{...catalog.records[index]},schematicConstraints:{...needs[0]},caseReviews:requiredCases.map(({caseId,basisId})=>({
    caseId,basisId,reviewRecordId:'fixture:'+caseId,disposition:'documented-for-schematic-review',
  })),
});
const run=(evidence,scope=expectations)=>reviewPreliminaryStockWithCaseEvidence(catalog,offers,needs,scope,evidence);

test('recomputes the frontier from evidence-eligible options without trusting an undocumented dominator',()=>{
  const report=run([receipt(1)]);
  assert.deepEqual(report.members[0].frontierOfferIds,['second']);
  assert.equal(report.members[0].candidates[0].schematicEligible,true);
  assert.equal(report.members[0].candidates[0].eligible,false);
  assert.equal(report.members[0].evidenceStatus,'DOCUMENTED_NOT_VERIFIED');
  assert.deepEqual(run([receipt(1),receipt(0)]).members[0].frontierOfferIds,['first']);
  assert.equal(report.evidenceIndependentlyVerified,false);
  assert.equal(report.approvedForStructuralUse,false);
  assert.equal(report.approvedForFabrication,false);
  assert.equal(report.ndsReady,false);
});

test('rejects stale grade or stock and missing, duplicated, unknown or held case receipts',()=>{
  for(const [alter,reason] of [
    [e=>e.reference.grade='other',/Stale stock, catalog reference/],
    [e=>e.stockRecordId='old',/Stale stock, catalog reference/],
    [e=>e.schematicConstraints.memberLengthIn=79, /Stale stock, catalog reference/],
    [e=>e.caseReviews.pop(),/Missing named case receipt/],
    [e=>e.caseReviews.push(e.caseReviews[0]),/Duplicate named case receipt/],
    [e=>e.caseReviews.push({...e.caseReviews[0],caseId:'unknown'}),/Unknown named case/],
    [e=>e.caseReviews[0].basisId='old',/Missing or stale basis/],
    [e=>e.caseReviews[0].disposition='held',/Named case remains held/],
  ]){
    const evidence=receipt(0);alter(evidence);
    const result=run([evidence]).members[0];
    assert.deepEqual(result.frontierOfferIds,[]);
    assert.match(result.candidates[0].evidenceHolds.join('\n'),reason);
  }
});

test('fails closed on missing, duplicate or stale expectations and unknown or duplicate receipts',()=>{
  for(const scope of [[],[...expectations,...expectations],[{...expectations[0],schematicRecordId:'old'}],
    [{...expectations[0],requiredCases:[requiredCases[0],requiredCases[0]]}]])
    assert.throws(()=>run([],scope));
  assert.throws(()=>run([receipt(0),receipt(0)]),/Duplicate stock option/);
  assert.throws(()=>run([{...receipt(0),offerId:'unknown'}]),/Unknown stock option/);
});
