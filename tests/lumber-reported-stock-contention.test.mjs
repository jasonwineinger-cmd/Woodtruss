import test from 'node:test';
import assert from 'node:assert/strict';
import {auditReportedStockContention as audit} from '../dist/lumber/src/reported-stock-contention.js';

const row=(referenceValueId,actualDepthIn)=>({referenceValueId,speciesGroup:'synthetic',grade:'fixture-grade',
 nominalSize:'fixture-size',actualWidthIn:2,actualDepthIn,referenceEdition:'fixture-edition',
 referencePublisher:'fixture-publisher',referenceTable:'fixture-table',fbPsi:101,ftPsi:102,fcPsi:103,
 fvPsi:104,ePsi:202,eMinPsi:201});
const catalog={catalogId:'fixture',records:[row('small',3),row('large',4)]};
const offer=(offerId,referenceValueId,stockLengthIn,availablePieces=1)=>
 ({offerId,referenceValueId,stockLengthIn,availablePieces,stockRecordId:'stock:'+offerId});
function referenceIdentity({referenceValueId,speciesGroup,grade,nominalSize,actualWidthIn,actualDepthIn,referenceEdition,referencePublisher,referenceTable}) {
  return {referenceValueId,speciesGroup,grade,nominalSize,actualWidthIn,actualDepthIn,referenceEdition,referencePublisher,referenceTable};
}
function stockConstraints({memberLengthIn,addedLengthIn,allowedReferenceValueIds,maxWidthIn,maxDepthIn}) {
  return {memberLengthIn,addedLengthIn,allowedReferenceValueIds,maxWidthIn,maxDepthIn};
}

function fixture() {
 const offers=[offer('a','small',80),{...offer('a-alias','small',80),stockRecordId:'stock:a'},
  offer('b','large',84)];
 const needs=['left','right'].map(memberId=>({memberId,schematicRecordId:'plan-r1',memberLengthIn:80,
  addedLengthIn:0,allowedReferenceValueIds:memberId==='left'?['small','large']:['small'],maxWidthIn:2,maxDepthIn:4}));
 const requiredCases=[{caseId:'fixture-case',basisId:'fixture-basis'}];
 const expectations=needs.map(({memberId,schematicRecordId})=>({memberId,schematicRecordId,requiredCases}));
 const evidence=needs.flatMap(need=>offers.map(candidate=>({
  memberId:need.memberId,schematicRecordId:need.schematicRecordId,offerId:candidate.offerId,
  stockRecordId:candidate.stockRecordId,reportedStockLengthIn:candidate.stockLengthIn,catalogId:catalog.catalogId,
  reference:referenceIdentity(catalog.records.find(row=>row.referenceValueId===candidate.referenceValueId)),
  schematicConstraints:stockConstraints(need),caseReviews:[{...requiredCases[0],reviewRecordId:'case:'+need.memberId+candidate.offerId,
   disposition:'documented-for-schematic-review'}],
 })));
 return {catalog:{...catalog,records:catalog.records.map(row=>({...row}))},offers,needs,expectations,evidence};
}
function summary(result,status,covered) {
 assert.equal(result.status,status,JSON.stringify(result));
 assert.equal(result.memberCount,2);
 assert.equal(result.maximumCoveredCount,covered);
 assert.equal(result.uncoveredCount,2-covered);
 assert.doesNotMatch(JSON.stringify(result),/stock:a|stock:b|a-alias/);
}

test('covers both members by making the local dominated option available to the more flexible member',()=>{
 const input=fixture();
 for(const offers of [input.offers,[...input.offers].reverse()])
  summary(audit({...input,offers}),'REPORTED_STOCK_COVERAGE_MATCH_ONLY',2);
});

test('same-stock aliases cannot multiply pieces, and held dominated alternatives cannot supply demand',()=>{
 const input=fixture();
 const evidence=input.evidence.map(row=>row.offerId==='b'?{...row,caseReviews:[{...row.caseReviews[0],disposition:'held'}]}:row);
 summary(audit({...input,evidence}),'HOLD_REPORTED_STOCK_COVERAGE',1);
 // Both aliases consistently reporting two pieces permits two members
 // without implying either alias supplies a distinct piece pool.
 const offers=input.offers.map(row=>row.stockRecordId==='stock:a'?{...row,availablePieces:2}:row);
 summary(audit({...input,offers,evidence}),'REPORTED_STOCK_COVERAGE_MATCH_ONLY',2);
});

test('holds contradictory descriptions of the same stock record, even with otherwise viable options',()=>{
 for(const change of [{stockLengthIn:81},{availablePieces:2},{referenceValueId:'large'}]){
  const input=fixture();
  Object.assign(input.offers[1],change);
  const result=audit(input);
  assert.equal(result.status,'HOLD_REPORTED_STOCK_COVERAGE',JSON.stringify(change));
  assert.doesNotMatch(JSON.stringify(result),/stock:a|stock:b|a-alias/);
 }
});
