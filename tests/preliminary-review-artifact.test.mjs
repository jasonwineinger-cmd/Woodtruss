import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {createPreliminaryMaterialsTraceabilityManifest,fingerprintPreliminaryMaterialsSource} from '../dist/fabrication/src/preliminary-materials-traceability.js';
import {createPreliminaryReviewHandoff} from '../dist/fabrication/src/preliminary-review-handoff.js';
import {receivePreliminaryReviewWire} from '../dist/fabrication/src/preliminary-review-wire.js';
import {packagePreliminaryReviewArtifact,verifyPreliminaryReviewArtifactBytes} from '../dist/fabrication/src/preliminary-review-artifact.js';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function job(revisionId='r2'){
  const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:48}],bars:[{id:'AB',a:'A',b:'B'}]};
  const expected={designId:'design',revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(model)};
  const snapshot=createPreliminaryMaterialsReport(expected.designId,revisionId,model);
  const evidence={snapshot,expected,traceabilityManifest:await createPreliminaryMaterialsTraceabilityManifest(snapshot)};
  const handoff=await createPreliminaryReviewHandoff(evidence);
  const policy={...expected,schemaVersion:handoff.schemaVersion,purpose:handoff.useScope,traceabilityManifestSha256:handoff.traceabilityManifestSha256};
  return {artifact:await packagePreliminaryReviewArtifact(evidence),policy,evidence};
}

test('proof is filename-independent, deterministic and compatible with standalone scope replay',async()=>{
  const {artifact,policy,evidence}=await job();
  assert.equal(artifact.manifest.sha256,sha(artifact.bytes));
  assert.equal(artifact.manifest.byteLength,artifact.bytes.byteLength);
  assert.equal(Object.hasOwn(artifact.manifest,'filename'),false);
  const transferred=Uint8Array.from(artifact.bytes);
  const manifest=JSON.parse(JSON.stringify(artifact.manifest));
  const proof=await verifyPreliminaryReviewArtifactBytes(transferred,manifest);
  assert.deepEqual(proof.acceptedEvidence,['EXACT_BYTE_LENGTH','SHA256_MATCH']);
  assert.deepEqual(proof.manifest,manifest);
  assert.equal(proof.fabricationAuthorized,false);
  assert.equal((await receivePreliminaryReviewWire(transferred,policy,evidence)).decision,'VERIFIED_REVIEW_IDENTITY');
});

test('detects same-size tampering, stale expected bytes, wrong counts and forged manifest fields',async()=>{
  const {artifact}=await job(), other=(await job('r3')).artifact;
  assert.equal(artifact.bytes.length,other.bytes.length);
  await assert.rejects(verifyPreliminaryReviewArtifactBytes(other.bytes,artifact.manifest),/SHA-256 mismatch/);
  for (const manifest of [
    {...artifact.manifest,byteLength:artifact.bytes.length+1},
    {...artifact.manifest,schemaVersion:'v2'},
    {...artifact.manifest,filename:'claims-match'},
    {...artifact.manifest,fabricationAuthorized:true},
    {...artifact.manifest,cutList:[]},
    {...artifact.manifest,sha256:'a'.repeat(64)},
  ]) await assert.rejects(verifyPreliminaryReviewArtifactBytes(artifact.bytes,manifest));
});

test('digest matching alone cannot grant source, schema or fabrication acceptance',async()=>{
  const {artifact,policy,evidence}=await job();
  const substituted=new TextEncoder().encode('{"machine":true}');
  const proof=await verifyPreliminaryReviewArtifactBytes(substituted,{
    ...artifact.manifest,byteLength:substituted.length,sha256:sha(substituted),
  });
  assert.deepEqual(proof.heldEvidence,['WIRE_SCHEMA_SCOPE_AND_SOURCE_REPLAY','ENGINEERING_AND_FABRICATION_RELEASE']);
  assert.equal(proof.fabricationAuthorized,false);
  assert.equal((await receivePreliminaryReviewWire(substituted,policy,evidence)).decision,'QUARANTINED');
});
