import assert from 'node:assert/strict';
import test from 'node:test';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';
import { recomputePreliminaryStockDemands, reviewStockWithRecomputedDemand } from '../dist/lumber/src/index.js';

test('exact frame section demand cannot qualify as named stock axial evidence', () => {
 const revision='synthetic-r5';
 const model={nodes:[{id:'a',x:0,y:0},{id:'b',x:60,y:0}],
  bars:[{id:'bar',a:'a',b:'b',areaIn2:6,elasticModulusPsi:80000}],loads:[],
  supports:[{nodeId:'a',fixX:true,fixY:true},{nodeId:'b',fixX:false,fixY:true}]};
 const caseId='axial',basisId='explicit-r1';
 const cases=[{basisId,definition:{id:caseId,description:'synthetic axial case',jointLoads:[{nodeId:'b',fxLb:40}]}}];
 const reference={referenceValueId:'s',speciesGroup:'synthetic',grade:'fixture',nominalSize:'test',
  actualWidthIn:2,actualDepthIn:3,referenceEdition:'fixture',referencePublisher:'fixture',referenceTable:'fixture',
  fbPsi:10,ftPsi:10,fcPsi:10,fvPsi:10,ePsi:20,eMinPsi:15};
 const catalog={catalogId:'test',records:[reference]};
 const need={memberId:'bar',schematicRecordId:'sketch',memberLengthIn:60,addedLengthIn:2,
  maxWidthIn:2,maxDepthIn:3,allowedReferenceValueIds:['s']};
 const offer={offerId:'stock-option',referenceValueId:'s',stockRecordId:'stock-a',stockLengthIn:64,availablePieces:1};
 const expectations=[{memberId:'bar',schematicRecordId:'sketch',requiredCases:[{caseId,basisId}]}];
 const solved=recomputePreliminaryStockDemands(revision,model,cases).solved.get(caseId);
 const exact={modelRevisionId:revision,contextKey:solved.contextKey,axialForceLb:solved.axialForceLb.get('bar')};
 const review=demand=>reviewStockWithRecomputedDemand(catalog,[offer],[need],expectations,[{
  memberId:'bar',schematicRecordId:'sketch',offerId:offer.offerId,
  stockRecordId:offer.stockRecordId,reportedStockLengthIn:offer.stockLengthIn,catalogId:'test',
  reference,schematicConstraints:need,caseReviews:[{caseId,basisId,reviewRecordId:'fixture-check',
   disposition:'documented-for-schematic-review',demand}],
 }],revision,model,cases);
 assert.deepEqual(review(exact).members[0].frontierOfferIds,[offer.offerId]);

 const frame=solveElasticFrame({
  nodes:[{id:'a',xIn:0,yIn:0},{id:'b',xIn:60,yIn:0}],
  members:[{id:'bar',startNodeId:'a',endNodeId:'b',areaIn2:6,secondMomentIn4:4.5,elasticModulusPsi:80000}],
  supports:[{nodeId:'a',fixX:true,fixY:true,fixRotation:true}],
  loads:[{nodeId:'b',fxLb:40,fyLb:-25,momentLbIn:0}],
 });
 assert.equal(frame.equilibrium.passes,true);
 assert.equal(frame.fabricationAuthorized,false);
 const section=frame.memberSectionDemand.bar;
 assert.equal(section.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(section.manufacturingApproved,false);
 assert.deepEqual(section.sections.map(row=>row.stationIn),[0,60]);
 assert.ok(section.sections.every(row=>Math.abs(row.axialLb-40)<1e-8));
 const [{momentLbIn:rootMoment},{momentLbIn:tipMoment}]=section.sections;
 assert.ok(Math.abs(rootMoment+1500)<1e-8);
 assert.ok(Math.abs(tipMoment)<1e-8);
 assert.ok(section.extrema.momentLbIn.min);
 for(const demand of [section,{...exact,axialForceLb:section},{...exact,axialForceLb:Math.abs(rootMoment)}]){
  const held=review(demand);
  assert.deepEqual(held.members[0].frontierOfferIds,[]);
  assert.match(held.members[0].candidates[0].analysisHolds.join(),/Stale recomputed axial-demand receipt: axial/u);
  assert.equal(held.approvedForStructuralUse,false);
  assert.equal(held.ndsReady,false);
 }
});
