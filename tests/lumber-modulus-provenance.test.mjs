import test from 'node:test';
import assert from 'node:assert/strict';
import {studyWithDocumentedModulus} from '../dist/lumber/src/index.js';

// Synthetic input values and artifact identities only; no AWC tables.
const row={referenceValueId:'item',speciesGroup:'synthetic species',grade:'grade',nominalSize:'synthetic stock',
  actualWidthIn:2,actualDepthIn:3,referenceEdition:'synthetic edition',referencePublisher:'synthetic publisher',
  referenceTable:'synthetic reference, no design values',fbPsi:101,ftPsi:102,fcPsi:103,fvPsi:104,ePsi:42157,eMinPsi:38023};
const catalog={catalogId:'synthetic',records:[row]};
const pub={edition:row.referenceEdition,supplementSha256:'a'.repeat(64),addendumId:'synthetic addendum',addendumSha256:'b'.repeat(64)};
const evidence=()=>({catalogId:catalog.catalogId,referenceValueId:row.referenceValueId,publisher:row.referencePublisher,
  table:row.referenceTable,speciesGroup:row.speciesGroup,grade:row.grade,nominalSize:row.nominalSize,
  actualWidthIn:row.actualWidthIn,actualDepthIn:row.actualDepthIn,
  mean:{column:'E',checkedValuePsi:row.ePsi,publication:{...pub},checkId:'synthetic E check'},
  minimum:{column:'Emin',checkedValuePsi:row.eMinPsi,publication:{...pub},checkId:'synthetic Emin check'}});
const envelope={status:'PRELIMINARY_NOT_ENGINEERED',memberForces:{web:{minLb:-250,maxLb:600,
  governingMinCase:'a',governingMaxCase:'b'}},reactions:{},warnings:[]};
const axis={unbracedLengthIn:45,effectiveLengthFactor:1,restraintBasis:'synthetic only'};
const pick=(e,modulus='catalog-minimum')=>studyWithDocumentedModulus(envelope,catalog,{
  memberId:'web',referenceValueId:row.referenceValueId,modulus,aboutWidthAxis:axis,aboutDepthAxis:axis},pub,e);

test('ties E and Emin independently to the selected preliminary modulus without exposing raw private values',()=>{
  const minimum=pick(evidence()), mean=pick(evidence(),'catalog-mean');
  assert.equal(minimum.documentationStatus,'DOCUMENTED_NOT_VERIFIED');
  assert.equal(minimum.selectedColumn,'Emin');
  assert.deepEqual(minimum.publication,pub);
  assert.equal(mean.selectedColumn,'E');
  assert.ok(mean.study.aboutDepthAxis.idealEulerReferenceLb>minimum.study.aboutDepthAxis.idealEulerReferenceLb);
  assert.equal(minimum.ndsReady,false);
  assert.equal(minimum.approvedForStructuralUse,false);
  assert.doesNotMatch(JSON.stringify(minimum),/checkedValuePsi|42157|38023|synthetic Emin check/);
});

test('holds mixed edition/addendum, wrong column, outdated value or changed grade before study',()=>{
  for(const mutate of [
    p=>p.minimum.publication.edition='other',
    p=>p.minimum.publication.addendumSha256='c'.repeat(64),
    p=>p.minimum.column='E',
    p=>p.mean.checkedValuePsi=row.eMinPsi,
    p=>p.actualWidthIn=4,
    p=>p.grade='changed',
  ]){
    const proof=evidence();
    mutate(proof);
    const result=pick(proof);
    assert.equal(result.documentationStatus,'HOLD_MISSING_OR_MIXED_MODULUS_EVIDENCE');
    assert.equal(result.study,null);
    assert.equal(result.ndsReady,false);
  }
  assert.equal(pick(undefined).study,null);
});
