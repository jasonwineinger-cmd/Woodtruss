import assert from 'node:assert/strict';
import test from 'node:test';
import {auditCatalogElasticMemberStiffness as audit} from '../dist/lumber/src/catalog-elastic-member-stiffness.js';

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
function noAuthorityOrEcho(result) {
  for(const flag of ['sourceIndependentlyVerified','approvedForStructuralUse','fabricationAuthorized'])
    assert.equal(result[flag],false,flag);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE|secret[./:]|getter ran|1254321|456789|54321|123456|765432|12345/);
}

test('binds two directed synthetic members using independently computed rectangular axes and different modulus bases',()=>{
  const input=fixture();
  const result=audit(input);
  assert.equal(result.status,'CATALOG_ELASTIC_MEMBER_STIFFNESS_MATCH_ONLY');
  assert.equal(result.matchedCount,2);
  noAuthorityOrEcho(result);
  input.assignments.reverse();
  assert.deepEqual(audit(input),result);
});

test('holds incorrect keys, scope, material assignment, axis, shear or capacity without inspecting getters',()=>{
  let getters=0;
  const m=i=>i.members[0], a=i=>i.assignments[0], r=i=>i.catalog.records[0];
  const cases=[
    i=>{m(i).releaseStartRotation=1;},
    i=>{delete m(i).releaseEndRotation;},
    i=>{m(i).startNodeId='PRIVATE-E';},
    i=>{[a(i).startNodeId,a(i).endNodeId]=[a(i).endNodeId,a(i).startNodeId];},
    i=>{a(i).bendingAxis='about-depth';},
    i=>{a(i).modulusBasis='catalog-minimum';},
    i=>{a(i).modelRevision='PRIVATE-old-revision';},
    i=>{a(i).catalogId='PRIVATE-other-catalog';},
    i=>{a(i).referenceValueId='PRIVATE-absent-reference';},
    i=>{i.assignments.pop();},
    i=>{i.assignments[1].assignmentRecordId=a(i).assignmentRecordId;},
    i=>{m(i).areaIn2=8;},
    i=>{m(i).secondMomentIn4=NaN;},
    i=>{m(i).shear={shearModulusPsi:37,effectiveShearAreaIn2:3};},
    i=>{m(i).capacityLb=37;},
    i=>{a(i).sourceIndependentlyVerified=true;},
    i=>{r(i).url='https://secret.invalid/material';},
    i=>{r(i).eMinPsi=r(i).ePsi+1;},
    i=>{Object.defineProperty(r(i),'ePsi',{enumerable:true,get(){getters++;throw new Error('getter ran');}});},
    i=>{Object.defineProperty(i,'assignments',{enumerable:true,get(){getters++;throw new Error('getter ran');}});},
  ];
  for(const [idx,alter] of cases.entries()) {
    const input=fixture();
    alter(input);
    const result=audit(input);
    assert.equal(result.status,'HOLD_CATALOG_ELASTIC_MEMBER_STIFFNESS',`mutation ${idx} unexpectedly admitted`);
    assert.notEqual(result.matchedCount,2);
    noAuthorityOrEcho(result);
  }
  assert.equal(getters,0);
});
