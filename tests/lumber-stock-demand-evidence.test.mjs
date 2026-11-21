import test from 'node:test';
import assert from 'node:assert/strict';
import { recomputePreliminaryStockDemands, reviewStockWithRecomputedDemand } from '../dist/lumber/src/index.js';

const revision='synthetic-model-1';
const model={nodes:[{id:'a',x:0,y:0},{id:'b',x:60,y:0}],
  bars:[{id:'bar',a:'a',b:'b',areaIn2:6,elasticModulusPsi:80000}],loads:[],
  supports:[{nodeId:'a',fixX:true,fixY:true},{nodeId:'b',fixX:false,fixY:true}]};
const def=(id,basisId,fxLb)=>({basisId,definition:{id,description:'synthetic axial case',jointLoads:[{nodeId:'b',fxLb}]}});
const cases=[def('push','push-r1',-500),def('pull','pull-r1',300)];
const reference={referenceValueId:'s',speciesGroup:'synthetic',grade:'fixture',nominalSize:'test',
  actualWidthIn:2,actualDepthIn:3,referenceEdition:'fixture',referencePublisher:'fixture',referenceTable:'fixture',
  fbPsi:10,ftPsi:10,fcPsi:10,fvPsi:10,ePsi:20,eMinPsi:15};
const catalog={catalogId:'test',records:[reference]};
const need={memberId:'bar',schematicRecordId:'sketch',memberLengthIn:60,addedLengthIn:2,
  maxWidthIn:2,maxDepthIn:3,allowedReferenceValueIds:['s']};
const offers=[{offerId:'small',referenceValueId:'s',stockRecordId:'stock-a',stockLengthIn:64,availablePieces:1},
  {offerId:'long',referenceValueId:'s',stockRecordId:'stock-b',stockLengthIn:70,availablePieces:1}];
const expectations=[{memberId:'bar',schematicRecordId:'sketch',requiredCases:cases.map(c=>({caseId:c.definition.id,basisId:c.basisId}))}];
const solved=recomputePreliminaryStockDemands(revision,model,cases);
const receipt=offer=>({memberId:'bar',schematicRecordId:'sketch',offerId:offer.offerId,
  stockRecordId:offer.stockRecordId,reportedStockLengthIn:offer.stockLengthIn,catalogId:'test',
  reference,schematicConstraints:need,caseReviews:expectations[0].requiredCases.map(({caseId,basisId})=>{
    const match=solved.solved.get(caseId);
    return {caseId,basisId,reviewRecordId:'fixture-check-'+caseId,disposition:'documented-for-schematic-review',
      demand:{modelRevisionId:revision,contextKey:match.contextKey,axialForceLb:match.axialForceLb.get('bar')}};
  })});
const review=(receipts,caseDefs=cases,revisionId=revision,currentModel=model)=>
  reviewStockWithRecomputedDemand(catalog,offers,[need],expectations,receipts,revisionId,currentModel,caseDefs);

test('recomputes signed axial cases and holds stale force for only the associated member/offer',()=>{
  assert.ok(Math.abs(solved.solved.get('push').axialForceLb.get('bar')+500)<1e-9);
  assert.ok(Math.abs(solved.solved.get('pull').axialForceLb.get('bar')-300)<1e-9);
  const good=offers.map(receipt);
  assert.deepEqual(review(good).members[0].frontierOfferIds,['small']);
  good[0].caseReviews[0].demand.axialForceLb=500;
  const result=review(good);
  assert.deepEqual(result.members[0].frontierOfferIds,['long']);
  assert.match(result.members[0].candidates.find(c=>c.offerId==='small').analysisHolds.join(),/Stale.*push/);
  assert.equal(result.approvedForStructuralUse,false);
  assert.equal(result.ndsReady,false);
});

test('missing or failing named solve cannot be replaced with a claimed receipt',()=>{
  const docs=offers.map(receipt);
  for (const entries of [[cases[0]],[cases[0],{...cases[1],definition:{...cases[1].definition,
    jointLoads:[{nodeId:'unknown',fxLb:300}]}}]]) {
    const result=review(docs,entries).members[0];
    assert.deepEqual(result.frontierOfferIds,[]);
    assert.ok(result.candidates.every(c=>c.analysisHolds.some(h=>h.includes('pull'))));
  }
});

test('requires the exact model revision and solved context even when axial force is unchanged',()=>{
  const docs=offers.map(receipt);
  assert.deepEqual(review(docs,cases,'synthetic-model-2').members[0].frontierOfferIds,[]);
  const changed={...model,nodes:[model.nodes[0],{...model.nodes[1],x:72}]};
  const newSolution=recomputePreliminaryStockDemands(revision,changed,cases);
  assert.ok(Math.abs(newSolution.solved.get('pull').axialForceLb.get('bar')-300)<1e-9);
  assert.deepEqual(review(docs,cases,revision,changed).members[0].frontierOfferIds,[]);
  assert.throws(()=>recomputePreliminaryStockDemands(revision,model,[cases[0],cases[0]]),/duplicate/);
});
