import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewPreliminaryStockFrontier} from '../dist/lumber/src/index.js';

const ref=(referenceValueId,actualWidthIn,actualDepthIn)=>({
  referenceValueId,actualWidthIn,actualDepthIn,speciesGroup:'synthetic',grade:'placeholder',nominalSize:'synthetic',
  referenceEdition:'fixture',referencePublisher:'fixture',referenceTable:'fixture',fbPsi:101,ftPsi:101,fcPsi:101,
  fvPsi:101,ePsi:201,eMinPsi:151,
});
const catalog={catalogId:'fixture',records:[ref('slender',2,3),ref('larger',2,4),ref('too-deep',2,6)]};
const offer=(offerId,referenceValueId,stockLengthIn,availablePieces=1)=>(
  {offerId,referenceValueId,stockLengthIn,availablePieces,stockRecordId:'stock:'+offerId});
const offers=[
  offer('a-narrow-long','slender',90),offer('b-wide-short','larger',82),offer('c-dominated','larger',95),
  offer('d-tie','larger',82),offer('e-too-short','slender',79.75),offer('f-deep','too-deep',80),
  offer('g-empty','slender',80,0),
];
const need={memberId:'chord',schematicRecordId:'concept:chord',memberLengthIn:79.5,addedLengthIn:0.5,
  maxWidthIn:2,maxDepthIn:4,allowedReferenceValueIds:['slender','larger']};

test('shows non-dominated stock/schematic options without hiding exact ties or recommending sizing',()=>{
  const report=reviewPreliminaryStockFrontier(catalog,[...offers].reverse(),[need]);
  assert.deepEqual(report,reviewPreliminaryStockFrontier(catalog,offers,[need]));
  const [member]=report.members;
  assert.equal(member.requestedLengthIn,80);
  assert.deepEqual(member.frontierOfferIds,['a-narrow-long','b-wide-short','d-tie']);
  assert.deepEqual(member.candidates.slice(0,2).map(c=>[c.areaIn2,c.unusedLengthIn]),[[6,10],[8,2]]);
  assert.deepEqual(member.candidates[4].holds,['stock-too-short']);
  assert.deepEqual(member.candidates[5].holds,['not-in-schematic-allowlist','exceeds-schematic-depth']);
  assert.deepEqual(member.candidates[6].holds,['no-pieces-in-reported-stock']);
  assert.equal(report.approvedForStructuralUse,false);
  assert.equal(report.inventoryAllocated,false);
});

test('empty frontier reports constraints; multiple members may see the same stock without allocation',()=>{
  const report=reviewPreliminaryStockFrontier(catalog,[offers[0]],[
    {...need,memberId:'span-b'},need,{...need,memberId:'span-c',memberLengthIn:100},
  ]);
  assert.deepEqual(report.members.map(m=>[m.memberId,m.frontierOfferIds]),[
    ['chord',['a-narrow-long']],['span-b',['a-narrow-long']],['span-c',[]],
  ]);
  assert.equal(report.approvedForFabrication,false);
  assert.equal(report.members[2].stockStatus,'HOLD_NO_ELIGIBLE_STOCK');
  assert.equal(reviewPreliminaryStockFrontier(catalog,[],[need]).members[0].stockStatus,'HOLD_NO_REPORTED_STOCK');
});

test('fails closed on untraceable, duplicate or unknown records and omitted assumptions',()=>{
  assert.throws(()=>reviewPreliminaryStockFrontier(catalog,[offers[0],offers[0]],[need]));
  assert.throws(()=>reviewPreliminaryStockFrontier(catalog,[{...offers[0],stockRecordId:''}],[need]));
  assert.throws(()=>reviewPreliminaryStockFrontier(catalog,[{...offers[0],referenceValueId:'not-a-record'}],[need]));
  assert.throws(()=>reviewPreliminaryStockFrontier(catalog,offers,[{...need,addedLengthIn:undefined}]));
  assert.throws(()=>reviewPreliminaryStockFrontier(catalog,offers,[{...need,allowedReferenceValueIds:[]}]));
});
