import test from 'node:test';
import assert from 'node:assert/strict';
import { assessLumberDesignInputEvidence } from '../dist/lumber/src/index.js';

// Explicitly synthetic, non-normative stand-ins. No actual design values.
const record = {
  speciesGroup:'Synthetic species',grade:'Synthetic grade',nominalSize:'Synthetic stock',
  actualWidthIn:2,actualDepthIn:3,referenceEdition:'Example edition',referencePublisher:'Synthetic publisher',
  referenceTable:'Example table',referenceValueId:'reference-1',fbPsi:23,ftPsi:23,fcPsi:23,fvPsi:23,ePsi:24,eMinPsi:22,
};
const catalog = { catalogId:'synthetic-catalog',records:[record] };
const sourceDocumentSha256 = 'a'.repeat(64);
const topics=['load-duration','moisture','temperature','size','repetitive-member','other-applicable'];
const evidence = () => ({
  reference:{checkedCatalogId:catalog.catalogId,checkedRecord:{...record},sourceDocumentSha256,
    independentCheckRecordId:'record-check-1'},
  factorScope:{referenceEdition:record.referenceEdition,referenceValueId:record.referenceValueId,
    checkedReferenceRecordId:'record-check-1',sourceDocumentSha256,reviewRecordId:'factor-intake-1',
    notes:topics.map(topic=>({topic,evidenceRecordId:'input-'+topic}))},
});
const assess=(proof,id=record.referenceValueId)=>assessLumberDesignInputEvidence(catalog,id,proof);

test('complete, exact intake is documented but never verified, NDS ready, or approved',()=>{
  assert.deepEqual(assess(evidence()),{
    documentationStatus:'DOCUMENTED_NOT_VERIFIED',outstanding:[],ndsReady:false,approvedForStructuralUse:false,
  });
});

test('an ID alone or exact ID with edited grade, dimension, edition, or values cannot inherit an old check',()=>{
  assert.equal(assess().documentationStatus,'HOLD_MISSING_OR_STALE_DOCUMENTATION');
  assert.match(assess(evidence(),'not-present').outstanding[0],/absent/);
  for (const [key,value] of [['grade','Other'],['actualDepthIn',4],['referenceEdition','Other'],['fbPsi',99]]) {
    const proof=evidence();
    proof.reference.checkedRecord[key]=value;
    const result=assess(proof);
    assert.equal(result.documentationStatus,'HOLD_MISSING_OR_STALE_DOCUMENTATION');
    assert.match(result.outstanding[0],/exact grade\/stock\/reference record/);
    assert.equal(JSON.stringify(result).includes('checkedRecord'),false);
  }
});

test('holds factor scopes from another check, edition or source and incomplete or duplicate topics',()=>{
  for (const tweak of [
    proof=>proof.factorScope.sourceDocumentSha256='b'.repeat(64),
    proof=>proof.factorScope.referenceEdition='different',
    proof=>proof.factorScope.checkedReferenceRecordId='other-check',
    proof=>proof.reference.sourceDocumentSha256='0'.repeat(64),
    proof=>proof.factorScope.notes.pop(),
    proof=>proof.factorScope.notes.push(proof.factorScope.notes[0]),
  ]) {
    const proof=evidence();
    tweak(proof);
    const result=assess(proof);
    assert.equal(result.documentationStatus,'HOLD_MISSING_OR_STALE_DOCUMENTATION');
    assert.equal(result.ndsReady,false);
    assert.ok(result.outstanding.length);
  }
});
