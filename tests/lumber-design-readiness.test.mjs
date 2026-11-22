import test from 'node:test';
import assert from 'node:assert/strict';
import { assessLumberDesignInputEvidence } from '../dist/lumber/src/index.js';

// Explicitly synthetic, non-normative stand-ins. No actual design values.
const record = {
  speciesGroup:'Synthetic species',grade:'Synthetic grade',nominalSize:'Synthetic stock',
  actualWidthIn:2,actualDepthIn:3,referenceEdition:'2099',referencePublisher:'Synthetic publisher',
  referenceTable:'Example table',referenceValueId:'reference-1',fbPsi:23,ftPsi:23,fcPsi:23,fvPsi:23,ePsi:24,eMinPsi:22,
};
const catalog = { catalogId:'synthetic-catalog',records:[record] };
const sourceDocumentSha256 = 'a'.repeat(64);
const rulesSha256 = 'b'.repeat(64);
const pair = () => ({
  publisher:record.referencePublisher,ruleEdition:record.referenceEdition,
  nds:{edition:record.referenceEdition,id:'rulebook',sha256:rulesSha256},
  supplement:{edition:record.referenceEdition,id:'stock-tables',sha256:sourceDocumentSha256},
  ndsUpdates:[{edition:record.referenceEdition,id:'rule-update',sha256:'c'.repeat(64)}],
  supplementUpdates:[{edition:record.referenceEdition,id:'table-update',sha256:'d'.repeat(64)}],
});
const topics=['load-duration','moisture','temperature','size','repetitive-member','other-applicable'];
const evidence = () => ({
  publicationPair:pair(),
  reference:{checkedCatalogId:catalog.catalogId,checkedRecord:{...record},sourceDocumentSha256,
    independentCheckRecordId:'record-check-1'},
  factorScope:{referenceEdition:record.referenceEdition,referenceValueId:record.referenceValueId,
    checkedReferenceRecordId:'record-check-1',sourceDocumentSha256:rulesSha256,reviewRecordId:'factor-intake-1',
    notes:topics.map(topic=>({topic,evidenceRecordId:'input-'+topic}))},
});
const assess=(proof,id=record.referenceValueId)=>assessLumberDesignInputEvidence(catalog,id,proof,pair());

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
    proof=>proof.factorScope.sourceDocumentSha256=sourceDocumentSha256,
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


test('correction references remain in the declared publication role',()=>{
  const proof=evidence();
  proof.reference.sourceDocumentSha256='d'.repeat(64);
  proof.factorScope.sourceDocumentSha256='c'.repeat(64);
  assert.equal(assess(proof).documentationStatus,'DOCUMENTED_NOT_VERIFIED');
  [proof.reference.sourceDocumentSha256,proof.factorScope.sourceDocumentSha256]=
    [proof.factorScope.sourceDocumentSha256,proof.reference.sourceDocumentSha256];
  assert.equal(assess(proof).documentationStatus,'HOLD_MISSING_OR_STALE_DOCUMENTATION');
});

test('legacy single document, missing independent scope and stale publication updates hold',()=>{
  const id=record.referenceValueId;
  const legacy=evidence();
  delete legacy.publicationPair;
  legacy.factorScope.sourceDocumentSha256=legacy.reference.sourceDocumentSha256;
  assert.equal(assess(legacy).documentationStatus,'HOLD_MISSING_OR_STALE_DOCUMENTATION');
  assert.equal(assessLumberDesignInputEvidence(catalog,id,evidence()).documentationStatus,'HOLD_MISSING_OR_STALE_DOCUMENTATION');
  const stale=evidence();
  stale.publicationPair.ndsUpdates=[];
  const result=assess(stale);
  assert.equal(result.documentationStatus,'HOLD_MISSING_OR_STALE_DOCUMENTATION');
  assert.equal(result.ndsReady,false);
  assert.equal(result.approvedForStructuralUse,false);
  assert.equal(JSON.stringify(result).includes(rulesSha256),false);
});
