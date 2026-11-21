import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {createPreliminaryMaterialsTraceabilityManifest,fingerprintPreliminaryMaterialsSource} from '../dist/fabrication/src/preliminary-materials-traceability.js';
import {createPreliminaryReviewHandoff} from '../dist/fabrication/src/preliminary-review-handoff.js';
import {evaluatePreliminaryReviewHandoff} from '../dist/fabrication/src/preliminary-review-consumer.js';

async function job(revisionId='rev2') {
  const geometry={nodes:[{id:'A',x:0,y:0},{id:'B',x:3,y:4}],bars:[{id:'AB',a:'A',b:'B'}]};
  const identity={designId:'design',revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(geometry)};
  const snapshot=createPreliminaryMaterialsReport(identity.designId,identity.revisionId,geometry);
  const evidence={snapshot,traceabilityManifest:await createPreliminaryMaterialsTraceabilityManifest(snapshot),expected:identity};
  const handoff=await createPreliminaryReviewHandoff(evidence);
  const expected={...identity,schemaVersion:'woodtruss.preliminary-review-handoff.v1',purpose:'EXTERNAL_REVIEW_IDENTITY_ONLY',
    traceabilityManifestSha256:handoff.traceabilityManifestSha256};
  return {evidence,handoff,expected};
}

test('only exposes frozen identity after compatible acceptance and verified replay',async()=>{
  const {evidence,handoff,expected}=await job();
  const output=await evaluatePreliminaryReviewHandoff(JSON.parse(JSON.stringify(handoff)),expected,evidence);
  assert.deepEqual(output,{schemaVersion:'woodtruss.preliminary-review-consumer-decision.v1',fabricationAuthorized:false,
    notice:'NOT FOR FABRICATION',decision:'VERIFIED_REVIEW_IDENTITY',handoff});
  assert.ok(Object.isFrozen(output)&&Object.isFrozen(output.handoff));
});

test('blocks unsupported consumers, unrecognized shape, stale identity and unsafe scope before evidence access',async()=>{
  const {handoff,expected}=await job();
  let touched=0;
  const poisonedEvidence={get snapshot(){touched++;throw Error('must not verify preflight rejects');}};
  const old=(await job('rev1')).handoff;
  const accessor={...handoff};
  Object.defineProperty(accessor,'useScope',{get(){throw Error('must not invoke');}});
  const cases=[
    [handoff,{...expected,schemaVersion:'v2'},'UNSUPPORTED_CONSUMER_SCHEMA'],
    [handoff,{...expected,purpose:'CUT'},'UNSUPPORTED_CONSUMER_PURPOSE'],
    [handoff,{...expected,traceabilityManifestSha256:'bad'},'INVALID_EXPECTATION'],
    [{...handoff,machining:{cut:true}},expected,'INVALID_HANDOFF_SHAPE'],
    [accessor,expected,'INVALID_HANDOFF_SHAPE'],
    [new Proxy({}, {ownKeys(){throw Error('unavailable');}}),expected,'INVALID_HANDOFF_SHAPE'],
    [{...handoff,schemaVersion:'v2'},expected,'UNSUPPORTED_HANDOFF_SCHEMA'],
    [{...handoff,fabricationAuthorized:true},expected,'UNSAFE_HANDOFF_SCOPE'],
    [old,expected,'IDENTITY_MISMATCH'],
    [{...handoff,traceabilityManifestSha256:'0'.repeat(64)},expected,'IDENTITY_MISMATCH'],
  ];
  for(const [candidate,policy,reason] of cases) {
    assert.deepEqual(await evaluatePreliminaryReviewHandoff(candidate,policy,poisonedEvidence),{
      schemaVersion:'woodtruss.preliminary-review-consumer-decision.v1',fabricationAuthorized:false,notice:'NOT FOR FABRICATION',
      decision:'QUARANTINED',reason,
    });
  }
  assert.equal(touched,0);
});

test('matching preflight data cannot replace trusted snapshot or allow digest spoofing',async()=>{
  const {evidence,handoff,expected}=await job();
  const stale=(await job('rev1')).evidence;
  assert.equal((await evaluatePreliminaryReviewHandoff(handoff,expected,stale)).reason,'REPLAY_FAILED');
  const fake='f'.repeat(64);
  const result=await evaluatePreliminaryReviewHandoff({...handoff,traceabilityManifestSha256:fake},
    {...expected,traceabilityManifestSha256:fake},evidence);
  assert.equal(result.decision,'QUARANTINED');
  assert.equal(result.reason,'REPLAY_FAILED');
  assert.equal(Object.hasOwn(result,'handoff'),false);
});
