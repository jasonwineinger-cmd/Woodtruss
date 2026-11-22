import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {createPreliminaryMaterialsTraceabilityManifest,fingerprintPreliminaryMaterialsSource} from '../dist/fabrication/src/preliminary-materials-traceability.js';
import {createPreliminaryReviewHandoff} from '../dist/fabrication/src/preliminary-review-handoff.js';
import {encodePreliminaryReviewWire,receivePreliminaryReviewWire,PRELIMINARY_REVIEW_WIRE_MAX_BYTES} from '../dist/fabrication/src/preliminary-review-wire.js';

const encode=text=>new TextEncoder().encode(text);
const decode=bytes=>new TextDecoder().decode(bytes);
async function fixture(revisionId='r2',width=600) {
  const model={nodes:[{id:'A',x:-100,y:0},{id:'B',x:width-100,y:48}],bars:[{id:'AB',a:'A',b:'B'}]};
  const expected={designId:'review‑α',revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(model)};
  const snapshot=createPreliminaryMaterialsReport(expected.designId,revisionId,model);
  const evidence={snapshot,expected,traceabilityManifest:await createPreliminaryMaterialsTraceabilityManifest(snapshot)};
  const handoff=await createPreliminaryReviewHandoff(evidence);
  const policy={...expected,schemaVersion:handoff.schemaVersion,purpose:handoff.useScope,traceabilityManifestSha256:handoff.traceabilityManifestSha256};
  return {evidence,policy,handoff};
}

test('standalone UTF-8 round trip carries bounded identity only and independently replays source',async()=>{
  const f=await fixture();
  const bytes=await encodePreliminaryReviewWire(f.evidence);
  const wire=decode(bytes);
  assert.deepEqual(JSON.parse(wire),f.handoff);
  assert.doesNotMatch(wire,/"members"|"joints"|"drawingSvg"|cutList|machineProgram/);
  assert.match(wire,/review‑α/);
  const result=await receivePreliminaryReviewWire(bytes,f.policy,f.evidence);
  assert.equal(result.decision,'VERIFIED_REVIEW_IDENTITY');
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(result.handoff,f.handoff);
  assert.deepEqual(await encodePreliminaryReviewWire(f.evidence),bytes);
});

test('ambiguous, noncanonical or unsafe data never reaches external review output',async()=>{
  const f=await fixture();
  const wire=decode(await encodePreliminaryReviewWire(f.evidence));
  for (const raw of [
    wire+'\n','\uFEFF'+wire,wire.replace('"revisionId":"r2"','"revisionId":"r1","revisionId":"r2"'),
    wire.slice(0,-1)+',"machineProgram":"start"}',
    JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(wire)).reverse())), '[]', 'null',
  ]) {
    const result=await receivePreliminaryReviewWire(encode(raw),f.policy,f.evidence);
    assert.equal(result.reason,'NONCANONICAL_WIRE_JSON');
    assert.equal(Object.hasOwn(result,'handoff'),false);
  }
  for (const bytes of [new Uint8Array(),new Uint8Array(PRELIMINARY_REVIEW_WIRE_MAX_BYTES+1),Uint8Array.from([0xc0,0xaf])]){
    assert.equal((await receivePreliminaryReviewWire(bytes,f.policy,f.evidence)).reason,'INVALID_WIRE_BYTES');
  }
  const unsafe=encode(wire.replace('"fabricationAuthorized":false','"fabricationAuthorized":true'));
  assert.equal((await receivePreliminaryReviewWire(unsafe,f.policy,f.evidence)).reason,'UNSAFE_HANDOFF_SCOPE');
});

test('rejects stale revision, wrong consumer scope, future wire schema and above-50ft trusted envelope',async()=>{
  const f=await fixture();
  const bytes=await encodePreliminaryReviewWire(f.evidence),wire=decode(bytes);
  const stale=await fixture('r1');
  assert.equal((await receivePreliminaryReviewWire(bytes,stale.policy,stale.evidence)).reason,'IDENTITY_MISMATCH');
  assert.equal((await receivePreliminaryReviewWire(bytes,{...f.policy,purpose:'MACHINE'},f.evidence)).reason,'UNSUPPORTED_CONSUMER_PURPOSE');
  const future=encode(wire.replace('woodtruss.preliminary-review-handoff.v1','woodtruss.preliminary-review-handoff.v2'));
  assert.equal((await receivePreliminaryReviewWire(future,f.policy,f.evidence)).reason,'UNSUPPORTED_HANDOFF_SCHEMA');
  const oversized=await fixture('r2',600.01);
  await assert.rejects(encodePreliminaryReviewWire(oversized.evidence),/50 ft/);
  const crafted=encode(JSON.stringify(oversized.handoff));
  assert.equal((await receivePreliminaryReviewWire(crafted,oversized.policy,oversized.evidence)).reason,'SOURCE_GEOMETRY_REVIEW_LIMIT_OR_INVALID');
});
