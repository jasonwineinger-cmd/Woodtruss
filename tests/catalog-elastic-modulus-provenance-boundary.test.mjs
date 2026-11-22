import assert from 'node:assert/strict';
import test from 'node:test';
import {auditCatalogElasticMemberStiffness as stiffness} from '../dist/lumber/src/catalog-elastic-member-stiffness.js';
import {auditCatalogElasticModulusProvenance as audit} from '../dist/lumber/src/catalog-elastic-modulus-provenance.js';

function fixture() {
  const modelId='PRIVATE-model',modelRevision='PRIVATE-r1',catalogId='PRIVATE-catalog',referenceValueId='PRIVATE-ref';
  const reference={referenceValueId,speciesGroup:'PRIVATE-species',grade:'PRIVATE-grade',nominalSize:'PRIVATE-size',
    referenceEdition:'PRIVATE-edition',referencePublisher:'PRIVATE-publisher',referenceTable:'PRIVATE-table',
    actualWidthIn:2,actualDepthIn:3,ePsi:1254321,eMinPsi:456789,fbPsi:54321,ftPsi:123456,fcPsi:765432,fvPsi:12345};
  // Rectangle 2 × 3: A=6, I_width=2(3^3)/12=4.5, I_depth=3(2^3)/12=2.
  const members=[
    {id:'PRIVATE-A',startNodeId:'PRIVATE-L',endNodeId:'PRIVATE-J',areaIn2:6,secondMomentIn4:4.5,
      elasticModulusPsi:1254321,releaseStartRotation:true,releaseEndRotation:false},
    {id:'PRIVATE-B',startNodeId:'PRIVATE-J',endNodeId:'PRIVATE-E',areaIn2:6,secondMomentIn4:2,
      elasticModulusPsi:456789,releaseStartRotation:false,releaseEndRotation:true},
  ];
  return {modelId,modelRevision,members,catalog:{catalogId,records:[reference]},
    assignments:members.map(({id:memberId,startNodeId,endNodeId},i)=>({
      modelId,modelRevision,memberId,startNodeId,endNodeId,catalogId,referenceValueId,
      bendingAxis:i===0?'about-width':'about-depth',modulusBasis:i===0?'catalog-mean':'catalog-minimum',
      assignmentRecordId:`PRIVATE-assignment-${i}`,
    }))};
}
function bundle() {
  const audit=fixture();
  const r=audit.catalog.records[0];
  const expectedSources=audit.assignments.map(({assignmentRecordId,catalogId,referenceValueId,modelId,modelRevision,memberId,startNodeId,endNodeId,bendingAxis},i)=>({
    modelId,modelRevision,memberId,startNodeId,endNodeId,bendingAxis,
    assignmentRecordId,catalogId,referenceValueId,quantity:i===0?'E':'Emin',
    publisher:r.referencePublisher,edition:r.referenceEdition,table:r.referenceTable,
    speciesGroup:r.speciesGroup,grade:r.grade,nominalSize:r.nominalSize,
    actualWidthIn:r.actualWidthIn,actualDepthIn:r.actualDepthIn,
    sourceRole:i===0?'nds-supplement':'nds-supplement-update',sourceArtifactId:`PRIVATE-artifact-${i}`,
    sourceArtifactSha256:(i===0?'a':'b').repeat(64),
  }));
  const receipts=expectedSources.map((row,i)=>({...row,checkedValuePsi:i===0?r.ePsi:r.eMinPsi}));
  return {audit,expectedSources,receipts};
}
function noAuthorityOrEcho(result) {
  for(const flag of ['sourceIndependentlyVerified','sourceBytesVerified','approvedForStructuralUse','fabricationAuthorized','ndsReady'])
    assert.equal(result[flag],false,flag);
  const wire=JSON.stringify(result);
  assert.doesNotMatch(wire,/PRIVATE|secret[./:]|getter ran|1254321|456789|54321|123456|765432|12345/);
  for (const char of ['a','b','c']) assert.ok(!wire.includes(char.repeat(64)));
}

test('reconciles two complete declared source rows without confusing E and Emin or verifying either artifact',()=>{
  const input=bundle();
  assert.equal(stiffness(input.audit).status,'CATALOG_ELASTIC_MEMBER_STIFFNESS_MATCH_ONLY');
  const result=audit(input);
  assert.equal(result.status,'CATALOG_ELASTIC_MODULUS_PROVENANCE_MATCH_ONLY');
  assert.equal(result.matchedCount,2);
  noAuthorityOrEcho(result);
  input.receipts.reverse();
  assert.deepEqual(audit(input),result);
});

test('holds missing, duplicated, swapped or unchecked claims, extra permissions and unread getters',()=>{
  let getters=0;
  const paired=(i,field,value)=>{i.expectedSources[0][field]=i.receipts[0][field]=value;};
  const cases=[
    i=>{i.expectedSources.pop();},
    i=>{i.receipts.pop();},
    i=>{i.receipts[1]={...i.receipts[0]};},
    i=>{i.expectedSources[1]={...i.expectedSources[0]};},
    i=>{i.audit.members[0].secondMomentIn4=2;},
    i=>{i.audit.assignments[0].assignmentRecordId='PRIVATE-stale';},
    i=>paired(i,'quantity','Emin'),
    i=>paired(i,'speciesGroup','PRIVATE-different-species'),
    i=>paired(i,'edition','PRIVATE-different-edition'),
    i=>paired(i,'actualDepthIn',4),
    i=>paired(i,'sourceRole','nds-standard'),
    i=>{i.receipts[0].sourceArtifactId='PRIVATE-different-artifact';},
    i=>{i.receipts[0].sourceArtifactSha256='c'.repeat(64);},
    i=>{i.receipts[0].checkedValuePsi=i.receipts[1].checkedValuePsi;},
    i=>{i.receipts[0].checkedValuePsi='1254321';},
    i=>{i.receipts[0].sourceBytesVerified=true;},
    i=>{i.receipts[0].url='https://secret.invalid/catalog';},
    i=>{Object.defineProperty(i.receipts[0],'checkedValuePsi',{enumerable:true,get(){getters++;throw new Error('getter ran');}});},
    i=>{Object.defineProperty(i,'expectedSources',{enumerable:true,get(){getters++;throw new Error('getter ran');}});},
  ];
  for(const [idx,alter] of cases.entries()) {
    const input=bundle();
    alter(input);
    const result=audit(input);
    assert.equal(result.status,'HOLD_CATALOG_ELASTIC_MODULUS_PROVENANCE',`mutation ${idx} unexpectedly admitted`);
    assert.notEqual(result.matchedCount,2);
    noAuthorityOrEcho(result);
  }
  assert.equal(getters,0);
});
