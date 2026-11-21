import assert from 'node:assert/strict';
import test from 'node:test';
import {comparePlateReferenceEvidence} from '../dist/connections/src/plate-reference-evidence.js';

const fixture=(family='integral-toothed')=>({
 identity:{manufacturer:'Synthetic plate maker',productCode:'P-1',family,issuer:'Synthetic report issuer',
  documentId:'TEST-123',revisedMonth:'2026-08',digestSha256:'a'.repeat(64),scope:'base report',locator:'section TEST',
  documentUrl:'https://example.test/plate.pdf'},
 basis:{use:family==='hinge'?'chord-end-hinge':'truss-member-joint',species:'Synthetic wood',grade:'Test grade',
  moistureAtAssembly:'dry',serviceMoisture:'dry',areaBasis:'net',angleDatum:'plate-long-axis',
  angleSense:'counterclockwise',faces:'paired-opposite'},
});

test('explicit metadata is review-only across all three separate connector families',()=>{
 for(const family of ['integral-toothed','nail-applied','hinge']){
  const record=fixture(family);
  assert.deepEqual(comparePlateReferenceEvidence(record,structuredClone(record)),{
   status:'METADATA_MATCH_UNVERIFIED',mismatches:[],sourceVerified:false,
   capacityVerified:false,fabricationAuthorized:false,machineReleaseAuthorized:false,
  });
 }
 assert.deepEqual(comparePlateReferenceEvidence(fixture(),fixture('nail-applied')).mismatches,['identity.family']);
 assert.deepEqual(comparePlateReferenceEvidence(fixture(),fixture('hinge')).mismatches,['identity.family','basis.use']);
});

test('rejects silent document or physical basis substitution',()=>{
 const expected=fixture();
 for(const [category,field,value] of [
  ['identity','manufacturer','Different maker'],['identity','productCode','P-2'],
  ['identity','revisedMonth','2025-05'],['identity','digestSha256','b'.repeat(64)],
  ['identity','scope','different supplement'],['identity','locator','other section'],
  ['basis','species','Different wood'],['basis','grade','Different grade'],
  ['basis','moistureAtAssembly','wet'],['basis','serviceMoisture','wet'],
  ['basis','areaBasis','gross'],['basis','angleDatum','plate-short-axis'],
  ['basis','angleSense','clockwise'],['basis','faces','single'],
 ]){
  const altered=fixture();altered[category][field]=value;
  const result=comparePlateReferenceEvidence(expected,altered);
  assert.equal(result.status,'REFERENCE_MISMATCH');
  assert.deepEqual(result.mismatches,[category+'.'+field]);
  assert.equal(result.fabricationAuthorized,false);
 }
});

test('requires explicit basis and rejects capacity fields, signed URLs and inconsistent hinge use',()=>{
 const expected=fixture();
 for(const mutate of [
  a=>delete a.basis.faces,
  a=>a.basis.areaBasis='unknown',
  a=>a.identity.productCode='',
  a=>a.identity.documentUrl='https://example.test/plate.pdf?token=abc',
  a=>a.identity.revisedMonth='2026-13',
  a=>a.identity.digestSha256='not-a-digest',
  a=>a.capacityLb=100,
  a=>a.basis.use='chord-end-hinge',
 ]){
  const altered=fixture();mutate(altered);
  assert.throws(()=>comparePlateReferenceEvidence(expected,altered),/plate reference metadata|plate manufacturer|plate use/);
 }
});
