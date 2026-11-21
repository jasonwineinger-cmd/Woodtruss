import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {verifyLocalPlateSourceArtifact} from '../dist/connections/src/plate-source-artifact.js';

const original=Buffer.from('Synthetic reference bytes only. No plate values.');
const hex=bytes=>createHash('sha256').update(bytes).digest('hex');
const authorized={purpose:'authorized-local-reference-review',sha256:hex(original)};
const fixture=()=>({
 identity:{manufacturer:'Synthetic Manufacturer',productCode:'TEST',family:'integral-toothed',issuer:'Test issuer',
 documentId:'TEST-1',revisedMonth:'2026-08',digestSha256:authorized.sha256,scope:'Synthetic base',
 locator:'Synthetic locator',documentUrl:'https://example.test/reference.pdf'},
 basis:{use:'truss-member-joint',species:'Test species',grade:'Test grade',moistureAtAssembly:'dry',
 serviceMoisture:'dry',areaBasis:'net',angleDatum:'plate-long-axis',angleSense:'counterclockwise',faces:'paired-opposite'},
});

test('accepts only matching explicitly authorized local bytes and metadata without echoing evidence',async()=>{
 const expected=fixture();
 const framed=Buffer.concat([Buffer.from('prefix'),original,Buffer.from('suffix')]);
 const bytes=framed.subarray(6,6+original.length);
 const checked=await verifyLocalPlateSourceArtifact(expected,authorized,{reference:fixture(),bytes});
 assert.deepEqual(checked,{status:'EXACT_ARTIFACT_REVIEW_ONLY',hold:null,exactAuthorizedBytesMatched:true,
  manufacturerSourceAuthenticated:false,applicabilityVerified:false,capacityVerified:false,
  engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false});
 assert.equal(JSON.stringify(checked).includes(authorized.sha256),false);
 const changed=Buffer.from(original);changed[0]=0;
 for(const invalid of [changed,framed]) {
  const rejected=await verifyLocalPlateSourceArtifact(expected,authorized,{reference:fixture(),bytes:invalid});
  assert.equal(rejected.hold,'LOCAL_BYTES_MISMATCH');
  assert.equal(rejected.exactAuthorizedBytesMatched,false);
 }
});

test('holds absent authorization, substitutes and stale editions even when local bytes match',async()=>{
 const expected=fixture();
 assert.equal((await verifyLocalPlateSourceArtifact(expected,null,{reference:fixture(),bytes:original})).hold,
  'MISSING_OR_INVALID_LOCAL_AUTHORIZATION');
 assert.equal((await verifyLocalPlateSourceArtifact(expected,authorized,{reference:fixture()})).hold,'LOCAL_BYTES_UNAVAILABLE');
 for(const [key,value] of [['family','nail-applied'],['revisedMonth','2025-05'],['productCode','OTHER'],
  ['documentId','OTHER'],['scope','different supplement'],['digestSha256','b'.repeat(64)]]){
  const reference=fixture();reference.identity[key]=value;
  assert.equal((await verifyLocalPlateSourceArtifact(expected,authorized,{reference,bytes:original})).hold,'REFERENCE_METADATA_MISMATCH');
 }
 // A replaced document and updated metadata still disagree with the independently authorized copy.
 const bytes=Buffer.from('substituted source');
 const claimed=fixture();claimed.identity.digestSha256=hex(bytes);
 assert.equal((await verifyLocalPlateSourceArtifact(claimed,authorized,{reference:claimed,bytes})).hold,'REFERENCE_METADATA_MISMATCH');
});
