import assert from 'node:assert/strict';
import test from 'node:test';
import {auditCatalogElasticModulusProvenance as review} from '../dist/lumber/src/catalog-elastic-modulus-provenance.js';

function auditFixture() {
 const modelId='synthetic-frame',modelRevision='r4',catalogId='synthetic-catalog';
 const record={referenceValueId:'synthetic-ref',speciesGroup:'synthetic',grade:'fixture',nominalSize:'test',
  actualWidthIn:2,actualDepthIn:6,referenceEdition:'2024',referencePublisher:'fixture',referenceTable:'fixture',
  fbPsi:1,ftPsi:1,fcPsi:1,fvPsi:1,ePsi:1_000_000,eMinPsi:250_000};
 const members=[
  {id:'beam-a',startNodeId:'a',endNodeId:'b',areaIn2:12,secondMomentIn4:36,elasticModulusPsi:1_000_000,
   releaseStartRotation:false,releaseEndRotation:true},
  {id:'beam-b',startNodeId:'b',endNodeId:'c',areaIn2:12,secondMomentIn4:4,elasticModulusPsi:250_000,
   releaseStartRotation:true,releaseEndRotation:false},
 ];
 const assignments=members.map(({id,startNodeId,endNodeId},idx)=>({modelId,modelRevision,memberId:id,startNodeId,
  endNodeId,catalogId,referenceValueId:record.referenceValueId,bendingAxis:idx?'about-depth':'about-width',
  modulusBasis:idx?'catalog-minimum':'catalog-mean',assignmentRecordId:'synthetic-receipt-'+idx}));
 return {modelId,modelRevision,members,catalog:{catalogId,records:[record]},assignments};
}

function noAuthority(result) {
 assert.equal(result.fabricationAuthorized,false);
 assert.equal(result.machineReleaseAuthorized,false);
}

function fixture() {
 const audit=auditFixture();
 const [row]=audit.catalog.records;
 const expectedSources=audit.assignments.map((assignment,index)=>({
  modelId:assignment.modelId,modelRevision:assignment.modelRevision,memberId:assignment.memberId,
  startNodeId:assignment.startNodeId,endNodeId:assignment.endNodeId,bendingAxis:assignment.bendingAxis,
  assignmentRecordId:assignment.assignmentRecordId,catalogId:audit.catalog.catalogId,
  referenceValueId:row.referenceValueId,quantity:index?'Emin':'E',publisher:row.referencePublisher,
  edition:row.referenceEdition,table:row.referenceTable,speciesGroup:row.speciesGroup,grade:row.grade,
  nominalSize:row.nominalSize,actualWidthIn:row.actualWidthIn,actualDepthIn:row.actualDepthIn,
  sourceRole:index?'nds-supplement-update':'nds-supplement',
  sourceArtifactId:index?'synthetic-update-document':'synthetic-supplement-document',
  sourceArtifactSha256:(index?'b':'a').repeat(64),
 }));
 const receipts=expectedSources.map((source,index)=>({...source,checkedValuePsi:index?row.eMinPsi:row.ePsi}));
 return {audit,expectedSources,receipts};
}

test('binds manual E and Emin receipts by exact assignment identity without approving the model',()=>{
 const input=fixture();
 input.receipts.reverse();
 const result=review(input);
 assert.equal(result.status,'CATALOG_ELASTIC_MODULUS_PROVENANCE_MATCH_ONLY',JSON.stringify(result));
 assert.equal(result.matchedCount,2);
 assert.deepEqual(result.outstanding,[]);
 noAuthority(result);
});

test('holds same numeric receipts with wrong documentary roles or member links',()=>{
 for(const change of [
  i=>{i.receipts[0].edition='2018';},
  i=>{i.receipts[0].grade='synthetic other grade';},
  i=>{i.receipts[0].speciesGroup='synthetic other group';},
  i=>{i.receipts[0].quantity='Emin';},
  i=>{i.receipts[0].sourceRole='nds-supplement-update';},
  i=>{i.receipts[0].actualDepthIn=2;},
  i=>{i.receipts[0].sourceArtifactId='different artifact';},
  i=>{i.receipts[0].sourceArtifactSha256='c'.repeat(64);},
  i=>{i.receipts[0].checkedValuePsi--;},
  i=>{i.receipts[0].checkedValuePsi=Infinity;},
  i=>{i.receipts[1].assignmentRecordId=i.receipts[0].assignmentRecordId;},
  i=>{i.expectedSources[1].assignmentRecordId=i.expectedSources[0].assignmentRecordId;},
  i=>{i.receipts.pop();},
  i=>{i.expectedSources.pop();},
  i=>{i.receipts[0].structuralUseApproved=true;},
  i=>{i.receipts[0].catalogId='wrong catalog';},
  i=>{i.receipts[0].quantity=i.expectedSources[0].quantity='Emin';},
  i=>{i.receipts[0].edition=i.expectedSources[0].edition='2018';},
  i=>{i.receipts[0].grade=i.expectedSources[0].grade='wrong grade';},
  i=>{i.receipts[0].sourceArtifactSha256=i.expectedSources[0].sourceArtifactSha256='0'.repeat(64);},
  i=>{i.audit.assignments[0].modelRevision='r3';},
  i=>{i.fabricationAuthorized=true;},
 ]) {
  const input=fixture();
  change(input);
  const result=review(input);
  assert.equal(result.status,'HOLD_CATALOG_ELASTIC_MODULUS_PROVENANCE',change.toString());
  noAuthority(result);
 }
});

test('reusing all assignment labels on a new revision does not carry old modulus receipts forward',()=>{
 const input=fixture();
 input.audit.modelRevision='independent-revised-model';
 for(const assignment of input.audit.assignments) assignment.modelRevision=input.audit.modelRevision;
 const result=review(input);
 assert.equal(result.status,'HOLD_CATALOG_ELASTIC_MODULUS_PROVENANCE');
 noAuthority(result);
});
