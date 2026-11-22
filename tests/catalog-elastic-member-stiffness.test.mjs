import assert from 'node:assert/strict';
import test from 'node:test';
import {auditCatalogElasticMemberStiffness as audit} from '../dist/lumber/src/catalog-elastic-member-stiffness.js';

function fixture() {
 const modelId='synthetic-frame',modelRevision='r4',catalogId='synthetic-catalog';
 const record={referenceValueId:'synthetic-ref',speciesGroup:'synthetic',grade:'fixture',nominalSize:'test',
  actualWidthIn:2,actualDepthIn:6,referenceEdition:'fixture',referencePublisher:'fixture',referenceTable:'fixture',
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

test('reconciles gross rectangle by explicitly chosen bending axis and catalog modulus without approval',()=>{
 const input=fixture();
 input.assignments.reverse();
 const result=audit(input);
 assert.equal(result.status,'CATALOG_ELASTIC_MEMBER_STIFFNESS_MATCH_ONLY',JSON.stringify(result));
 assert.equal(result.matchedCount,2);
 noAuthority(result);
});

test('holds stale assignments, geometry and modulus changes, incomplete coverage or unsourced shear',()=>{
 for(const change of [
  i=>{i.assignments[0].modelId='different-frame';},
  i=>{i.assignments[0].modelRevision='r3';},
  i=>{i.assignments[0].memberId='BEAM-A';},
  i=>{i.assignments[0].catalogId='different-catalog';},
  i=>{i.assignments[0].referenceValueId='missing-ref';},
  i=>{[i.assignments[0].startNodeId,i.assignments[0].endNodeId]=['b','a'];},
  i=>{i.assignments[0].bendingAxis='about-depth';},
  i=>{i.assignments[1].modulusBasis='catalog-mean';},
  i=>{i.assignments[1].assignmentRecordId=i.assignments[0].assignmentRecordId;},
  i=>{i.assignments.pop();},
  i=>{i.assignments.push({...i.assignments[0]});},
  i=>{i.members[0].areaIn2=11.99;},
  i=>{i.members[0].secondMomentIn4=4;},
  i=>{i.members[0].elasticModulusPsi=999_999;},
  i=>{i.members[0].shear={shearModulusPsi:55_000,effectiveShearAreaIn2:10};},
  i=>{delete i.members[0].releaseStartRotation;},
  i=>{i.catalog.records.push({...i.catalog.records[0]});},
  i=>{i.catalog.records[0].actualDepthIn=Infinity;},
  i=>{i.catalog.records[0].ePsi=NaN;},
 ]) {
  const input=fixture();
  change(input);
  const result=audit(input);
  assert.equal(result.status,'HOLD_CATALOG_ELASTIC_MEMBER_STIFFNESS',change.toString());
  noAuthority(result);
 }
});
