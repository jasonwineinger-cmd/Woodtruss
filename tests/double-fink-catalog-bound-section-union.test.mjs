import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDoubleFinkTopology} from '../dist/geometry/src/double-fink-topology.js';
import {reviewDoubleFinkCatalogBoundSectionDemands as review}
  from '../dist/lumber/src/double-fink-catalog-bound-section-review.js';

test('different named bending axes bind the union of selected members across signed cases only',()=>{
 const modelId='synthetic-two-axis-model',modelRevision='rev-exact',catalogId='synthetic-only';
 const row={referenceValueId:'synthetic-section',speciesGroup:'fixture',grade:'fictional',nominalSize:'test',
  actualWidthIn:2,actualDepthIn:6,referenceEdition:'2024',referencePublisher:'test-publisher',referenceTable:'test-table',
  fbPsi:1,ftPsi:1,fcPsi:1,fvPsi:1,ePsi:1_000_000,eMinPsi:250_000};
 const cutMembers=[['top-L-T1','T1','about-width'],['bottom-L-B1','B1','about-depth']];
 const roof={family:'common',spanFt:40,pitchRisePer12:6};
 const caseIds=['positive','reversed'];
 const study={modelId,modelRevision,roof,memberAssignments:generateDoubleFinkTopology(roof).members.map(({id,start,end})=>({
  memberId:id,startNodeId:start,endNodeId:end,areaIn2:12,secondMomentIn4:id==='bottom-L-B1'?4:36,
  elasticModulusPsi:row.ePsi,releaseStartRotation:true,releaseEndRotation:true,
 })),supports:[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},{nodeId:'E',fixX:false,fixY:true,fixRotation:false}],
 sources:[{caseId:'peak',sourceRef:'synthetic apex force',loads:[{nodeId:'T4',fxLb:100,fyLb:-480,momentLbIn:0}]}],
 combinations:caseIds.map((caseId,i)=>({caseId,sourceRef:'explicit signed factor',terms:[{caseId:'peak',factor:i?-.5:1}]})),
 caseCuts:cutMembers.map(([memberId,endNodeId],i)=>({caseId:caseIds[i],memberCuts:[
  {memberId,startNodeId:'L',endNodeId,cuts:[{stationIn:0,side:'continuous'}]},
 ]}))};
 const assignments=cutMembers.map(([memberId,endNodeId,bendingAxis],i)=>({
  modelId,modelRevision,memberId,startNodeId:'L',endNodeId,bendingAxis,assignmentRecordId:'axis-record-'+i,
  catalogId,referenceValueId:row.referenceValueId,modulusBasis:'catalog-mean',
 }));
 const expectedSources=assignments.map(a=>({
  modelId,modelRevision,memberId:a.memberId,startNodeId:a.startNodeId,endNodeId:a.endNodeId,bendingAxis:a.bendingAxis,
  assignmentRecordId:a.assignmentRecordId,catalogId,referenceValueId:row.referenceValueId,quantity:'E',
  publisher:row.referencePublisher,edition:row.referenceEdition,table:row.referenceTable,speciesGroup:row.speciesGroup,
  grade:row.grade,nominalSize:row.nominalSize,actualWidthIn:row.actualWidthIn,actualDepthIn:row.actualDepthIn,
  sourceRole:'nds-supplement',sourceArtifactId:'synthetic-reference',sourceArtifactSha256:'a'.repeat(64),
 }));
 const receipts=expectedSources.map(source=>({...source,checkedValuePsi:row.ePsi})).reverse();
 const input={study,catalog:{catalogId,records:[row]},assignments,expectedSources,receipts};
 const result=review(input);
 assert.equal(result.status,'DOUBLE_FINK_CATALOG_BOUND_SECTION_REVIEW_ONLY');
 assert.deepEqual([result.modelId,result.modelRevision],[modelId,modelRevision]);
 assert.equal(result.selectedMemberCount,2); assert.equal(result.allModelMembersVerified,false);
 assert.equal(result.fabricationAuthorized,false);
 const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-7,`${a} != ${b}`);
 // Independent left free body before first bay: R=(-100,+215).
 // Top axial balances Y via sin=1/sqrt(5); bottom axial is 100+2*215=530.
 for(const [i,axial] of [-215*Math.sqrt(5),-265].entries()){
  assert.equal(result.cases[i].caseId,caseIds[i]);
  const [member]=result.cases[i].memberCuts;
  assert.equal(member.memberId,cutMembers[i][0]);
  const [cut]=member.cuts; near(cut.axialLb,axial); near(cut.shearLb,0); near(cut.momentLbIn,0);
 }
 const held=review({...input,assignments:assignments.slice(0,1)});
 assert.equal(held.status,'HOLD_DOUBLE_FINK_CATALOG_BOUND_SECTION_REVIEW');
 assert.deepEqual(held.cases,[]);
 assert.ok(!Object.hasOwn(held,'modelRevision'));
});
