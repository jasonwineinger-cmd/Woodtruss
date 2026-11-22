import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewPreliminaryStockFrontier,reviewPreliminaryStockWithCaseEvidence} from '../dist/lumber/src/index.js';

const row=(referenceValueId,actualDepthIn)=>({referenceValueId,speciesGroup:'synthetic',grade:'fixture-grade',
 nominalSize:'fixture-size',actualWidthIn:2,actualDepthIn,referenceEdition:'fixture-edition',
 referencePublisher:'fixture-publisher',referenceTable:'fixture-table',fbPsi:101,ftPsi:102,fcPsi:103,
 fvPsi:104,ePsi:202,eMinPsi:201});
const catalog={catalogId:'fixture',records:[row('small',3),row('large',4)]};
const offer=(offerId,referenceValueId,stockLengthIn,availablePieces=1)=>
 ({offerId,referenceValueId,stockLengthIn,availablePieces,stockRecordId:'stock:'+offerId});
const offers=[offer('wide-b','large',82),offer('tight-z','small',80),offer('empty','small',80,0),
 offer('tight-a','small',80),offer('wide-a','large',82),offer('short','small',79)];
const need={memberId:'chord',schematicRecordId:'schematic-r1',memberLengthIn:80,addedLengthIn:0,
 allowedReferenceValueIds:['small','large'],maxWidthIn:2,maxDepthIn:4};
const scope={memberId:'chord',schematicRecordId:'schematic-r1',
 requiredCases:[{caseId:'fixture-case',basisId:'fixture-basis'}]};
const receipt=(candidate,disposition='documented-for-schematic-review')=>({
 memberId:scope.memberId,schematicRecordId:scope.schematicRecordId,offerId:candidate.offerId,
 stockRecordId:candidate.stockRecordId,reportedStockLengthIn:candidate.stockLengthIn,catalogId:catalog.catalogId,
 reference:{...catalog.records.find(row=>row.referenceValueId===candidate.referenceValueId)},
 schematicConstraints:{...need},caseReviews:[{...scope.requiredCases[0],reviewRecordId:'case:'+candidate.offerId,disposition}],
});
test('schematic frontier keeps both equal Pareto points in deterministic ID order without rewriting input',()=>{
 const ids=offers.map(row=>row.offerId);
 for(const input of [offers,[...offers].reverse()]){
  const result=reviewPreliminaryStockFrontier(catalog,input,[need]);
  assert.deepEqual(result.members[0].frontierOfferIds,['tight-a','tight-z']);
  assert.equal(result.approvedForStructuralUse,false);
  assert.equal(result.approvedForFabrication,false);
 }
 assert.deepEqual(offers.map(row=>row.offerId),ids);
});
test('case evidence holds both dominators first, then both eligible ties reappear; documented ineligible offers remain excluded',()=>{
 for(const input of [offers,[...offers].reverse()]){
  const notes=offers.filter(row=>row.offerId!=='tight-z')
   .map(row=>receipt(row,row.offerId==='tight-a'?'held':'documented-for-schematic-review'));
  const result=reviewPreliminaryStockWithCaseEvidence(catalog,input,[need],[scope],notes);
  const member=result.members[0];
  assert.deepEqual(member.frontierOfferIds,['wide-a','wide-b']);
  for(const id of ['empty','short']){
   const c=member.candidates.find(row=>row.offerId===id);
   assert.equal(c.schematicEligible,false);
   assert.equal(c.eligible,false);
   assert.deepEqual(c.evidenceHolds,[]);
  }
  for(const id of ['tight-a','tight-z']){
   const c=member.candidates.find(row=>row.offerId===id);
   assert.equal(c.schematicEligible,true);
   assert.equal(c.eligible,false);
   assert.match(c.evidenceHolds.join(' '),id==='tight-a'?/remains held/:/Missing exact/);
  }
  assert.equal(result.evidenceIndependentlyVerified,false);
  assert.equal(result.approvedForFabrication,false);
  assert.deepEqual(reviewPreliminaryStockWithCaseEvidence(catalog,input,[need],[scope],offers.map(row=>receipt(row)))
   .members[0].frontierOfferIds,['tight-a','tight-z']);
 }
});
