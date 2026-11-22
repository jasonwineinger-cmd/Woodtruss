import assert from 'node:assert/strict';
import test from 'node:test';
import {auditReportedStockContention as audit} from '../dist/lumber/src/reported-stock-contention.js';

function referenceIdentity({referenceValueId,speciesGroup,grade,nominalSize,actualWidthIn,actualDepthIn,referenceEdition,referencePublisher,referenceTable}) {
  return {referenceValueId,speciesGroup,grade,nominalSize,actualWidthIn,actualDepthIn,referenceEdition,referencePublisher,referenceTable};
}
function stockConstraints({memberLengthIn,addedLengthIn,allowedReferenceValueIds,maxWidthIn,maxDepthIn}) {
  return {memberLengthIn,addedLengthIn,allowedReferenceValueIds,maxWidthIn,maxDepthIn};
}

function fixture() {
  const catalogId='PRIVATE-catalog';
  const records=[3,4,5].map((actualDepthIn,i)=>({
    referenceValueId:'PRIVATE-reference-'+i,actualWidthIn:2,actualDepthIn,speciesGroup:'PRIVATE-species',
    grade:'PRIVATE-grade',nominalSize:'PRIVATE-size',referenceEdition:'PRIVATE-edition',
    referencePublisher:'PRIVATE-publisher',referenceTable:'PRIVATE-table',fbPsi:5101,ftPsi:5102,
    fcPsi:5103,fvPsi:5104,ePsi:1520202,eMinPsi:50201,
  }));
  const offers=records.map(({referenceValueId},i)=>({offerId:'PRIVATE-offer-'+i,referenceValueId,
    stockLengthIn:80+i,availablePieces:1,stockRecordId:'PRIVATE-stock-'+i}));
  const choices=[[0,1],[1,2],[0]];
  const needs=choices.map((indices,i)=>({memberId:'PRIVATE-member-'+i,schematicRecordId:'PRIVATE-design',
    memberLengthIn:80,addedLengthIn:0,maxWidthIn:2,maxDepthIn:5,
    allowedReferenceValueIds:indices.map(index=>records[index].referenceValueId)}));
  const requiredCases=[{caseId:'PRIVATE-case',basisId:'PRIVATE-basis'}];
  const expectations=needs.map(({memberId,schematicRecordId})=>({memberId,schematicRecordId,requiredCases}));
  const evidence=needs.flatMap((need,i)=>choices[i].map(index=>({
    memberId:need.memberId,schematicRecordId:need.schematicRecordId,offerId:offers[index].offerId,
    stockRecordId:offers[index].stockRecordId,reportedStockLengthIn:offers[index].stockLengthIn,
    catalogId,reference:referenceIdentity(records[index]),schematicConstraints:stockConstraints(need),
    caseReviews:[{...requiredCases[0],reviewRecordId:`PRIVATE-receipt-${i}-${index}`,disposition:'documented-for-schematic-review'}],
  })));
  return {catalog:{catalogId,records},offers,needs,expectations,evidence};
}
function privateAndNoAuthority(result) {
  for(const flag of ['reportedInventoryIndependentlyVerified','inventoryAllocated','approvedForStructuralUse',
    'fabricationAuthorized','machineReleaseAuthorized']) assert.equal(result[flag],false,flag);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE|secret[./:]|getter ran|1520202|50201/);
  assert.ok(!Object.keys(result).some(k=>/assignments|allocations|matches|memberIds|offerIds|stockRecordIds/i.test(k)));
}

test('a two-hop contention chain can cover three unit demands without returning any allocation',()=>{
  const input=fixture();
  const result=audit(input);
  assert.equal(result.status,'REPORTED_STOCK_COVERAGE_MATCH_ONLY');
  assert.equal(result.memberCount,3);
  assert.equal(result.maximumCoveredCount,3);
  assert.equal(result.uncoveredCount,0);
  privateAndNoAuthority(result);
  input.offers.reverse();
  input.evidence.reverse();
  assert.deepEqual(audit(input),result);
  // The middle member's larger/longer offer is dominated individually but
  // unavoidable collectively: without that evidence, three needs share two pieces.
  input.evidence=input.evidence.filter(e=>e.offerId!=='PRIVATE-offer-2');
  const shortage=audit(input);
  assert.equal(shortage.status,'HOLD_REPORTED_STOCK_COVERAGE');
  assert.equal(shortage.memberCount,3);
  assert.equal(shortage.maximumCoveredCount,2);
  assert.equal(shortage.uncoveredCount,1);
  privateAndNoAuthority(shortage);
});

test('rejects hidden reads, injected authority and excessive row bounds without leaking input',()=>{
  let getters=0;
  const cases=[
    i=>{i.inventoryAllocated=true;},
    i=>{i.path='/secret/catalog.json';},
    i=>{i.evidence[0].url='https://secret.invalid/stocks';},
    i=>{i.evidence[0].caseReviews[0].approvedForStructuralUse=true;},
    i=>{i.needs[0].inventoryAllocated=true;},
    i=>{Object.defineProperty(i.offers[0],'stockLengthIn',{enumerable:true,get(){getters++;throw new Error('getter ran');}});},
    i=>{Object.defineProperty(i.evidence[0].caseReviews[0],'disposition',{enumerable:true,get(){getters++;throw new Error('getter ran');}});},
    i=>{i.needs=Array.from({length:251},(_,j)=>({...i.needs[0],memberId:`PRIVATE-large-member-${j}`}));
      i.expectations=i.needs.map(need=>({...i.expectations[0],memberId:need.memberId}));},
    i=>{i.offers=Array.from({length:501},(_,j)=>({...i.offers[0],offerId:`PRIVATE-large-offer-${j}`,
      stockRecordId:`PRIVATE-large-stock-${j}`}));},
  ];
  for(const [idx,alter] of cases.entries()){
    const input=fixture();
    alter(input);
    const result=audit(input);
    assert.equal(result.status,'HOLD_REPORTED_STOCK_COVERAGE',`mutation ${idx} admitted`);
    privateAndNoAuthority(result);
  }
  assert.equal(getters,0);
});
