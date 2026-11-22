import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogElasticModulusSourceRowMatches as matches } from '../dist/lumber/src/catalog-elastic-modulus-source-row.js';

function fixture(quantity='E', sourceRole='nds-supplement') {
  const identity = {
    modelId:'model',modelRevision:'r1',memberId:'bar',startNodeId:'a',endNodeId:'b',bendingAxis:'about-width',
    assignmentRecordId:'synthetic-assignment',catalogId:'synthetic-catalog',referenceValueId:'synthetic-reference',
    quantity,publisher:'synthetic-publisher',edition:'synthetic-edition',table:'synthetic-table',
    speciesGroup:'synthetic-group',grade:'synthetic-grade',nominalSize:'synthetic-size',actualWidthIn:2,actualDepthIn:4,
  };
  const valuePsi=quantity==='Emin'?654321:1234567;
  const scope={...identity,valuePsi};
  const expected={...identity,sourceRole,sourceArtifactId:'synthetic-artifact',sourceArtifactSha256:'ab'.repeat(32)};
  return {scope,expected,receipt:{...expected,checkedValuePsi:valuePsi}};
}

test('equal synthetic modulus cannot substitute for the exact source row or artifact role',()=>{
  const {scope,expected,receipt}=fixture();
  assert.equal(matches(expected,receipt,scope),true);
  const alternates={
    sourceRole:'nds-supplement-update',sourceArtifactId:'other-artifact',sourceArtifactSha256:'cd'.repeat(32),
    edition:'other-edition',table:'other-table',speciesGroup:'other-group',grade:'other-grade',
    nominalSize:'other-size',actualWidthIn:4,actualDepthIn:2,referenceValueId:'other-row',catalogId:'other-catalog',
    assignmentRecordId:'other-assignment',quantity:'Emin',modelRevision:'r2',bendingAxis:'about-depth',startNodeId:'b',endNodeId:'a',
  };
  for(const [field,other] of Object.entries(alternates)){
    assert.equal(matches(expected,{...receipt,[field]:other},scope),false,`receipt substitution: ${field}`);
  }
  for(const field of ['edition','table','referenceValueId','assignmentRecordId','quantity','modelRevision','bendingAxis','startNodeId','endNodeId']){
    const other=alternates[field];
    assert.equal(matches({...expected,[field]:other},{...receipt,[field]:other},scope),false,
      `colluding row mismatch: ${field}`);
  }
});

test('exact independently declared minimum-modulus row can match without inferring it from mean',()=>{
  const {scope,expected,receipt}=fixture('Emin','nds-supplement-update');
  assert.equal(matches(expected,receipt,scope),true);
  assert.equal(matches(expected,{...receipt,checkedValuePsi:fixture().scope.valuePsi},scope),false);
  assert.equal(matches(expected,{...receipt,checkedValuePsi:scope.valuePsi+1},scope),false);
  assert.equal(matches(expected,{...receipt,derivedFromMean:true},scope),false);
});
