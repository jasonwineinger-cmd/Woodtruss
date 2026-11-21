import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {createPreliminaryMaterialsTraceabilityManifest,fingerprintPreliminaryMaterialsSource} from '../dist/fabrication/src/preliminary-materials-traceability.js';
import {createPreliminaryReviewHandoff,verifyPreliminaryReviewHandoff} from '../dist/fabrication/src/preliminary-review-handoff.js';

const model=y=>({nodes:[{id:'A',x:0,y:0},{id:'B',x:3,y}],bars:[{id:'AB',a:'A',b:'B'}]});
async function evidence(revisionId='r2',y=4,designId='design') {
  const geometry=model(y);
  const expected={designId,revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(geometry)};
  const snapshot=createPreliminaryMaterialsReport(designId,revisionId,geometry);
  return {expected,snapshot,traceabilityManifest:await createPreliminaryMaterialsTraceabilityManifest(snapshot)};
}

test('exports an identity-only immutable review handoff with an independently reproducible digest',async()=>{
  const e=await evidence();
  const h=await createPreliminaryReviewHandoff(e);
  const vector=JSON.stringify(['woodtruss.preliminary-review-handoff.manifest-digest.v1',
    'woodtruss.preliminary-materials-traceability.v1','design','r2',e.expected.sourceGeometrySha256,
    'PRELIMINARY_NOT_ENGINEERED','NOT FOR FABRICATION',false,'CANONICAL_INCH_JOINTS_AND_DIRECTED_MEMBER_ENDPOINTS_V1']);
  assert.deepEqual(h,{
    schemaVersion:'woodtruss.preliminary-review-handoff.v1',designId:'design',revisionId:'r2',
    sourceGeometrySha256:e.expected.sourceGeometrySha256,traceabilityManifestSha256:createHash('sha256').update(vector).digest('hex'),
    status:'PRELIMINARY_NOT_ENGINEERED',useScope:'EXTERNAL_REVIEW_IDENTITY_ONLY',blockedUse:'NO_STOCK_CUT_PRESS_MACHINE_OR_RELEASE_USE',
    notice:'NOT FOR FABRICATION',fabricationAuthorized:false,
  });
  assert.equal(Object.isFrozen(h),true);
  assert.deepEqual(await verifyPreliminaryReviewHandoff(JSON.parse(JSON.stringify(h)),e),h);
});

test('rejects stale and re-issued handoffs for untrusted expected source identity',async()=>{
  const current=await evidence(), stale=await evidence('r1'), substituted=await evidence('r2',-4);
  const h=await createPreliminaryReviewHandoff(current);
  assert.notEqual(h.traceabilityManifestSha256,(await createPreliminaryReviewHandoff(stale)).traceabilityManifestSha256);
  await assert.rejects(verifyPreliminaryReviewHandoff(await createPreliminaryReviewHandoff(stale),current),/mismatched/);
  await assert.rejects(createPreliminaryReviewHandoff({...substituted,expected:current.expected}),/source geometry/);
  await assert.rejects(verifyPreliminaryReviewHandoff(await createPreliminaryReviewHandoff(substituted),current),/mismatched/);
  await assert.rejects(verifyPreliminaryReviewHandoff(h,{...current,traceabilityManifest:stale.traceabilityManifest}),/does not match/);
});

test('rejects unknown fields, claims, versions, digests and accessor-based spoofing',async()=>{
  const e=await evidence(),h=await createPreliminaryReviewHandoff(e);
  for (const bad of [{...h,members:[]},{...h,machineOutput:{}},{...h,fabricationAuthorized:true},{...h,useScope:'CUTTING'},
    {...h,schemaVersion:'woodtruss.preliminary-review-handoff.v2'},{...h,traceabilityManifestSha256:'0'.repeat(64)},Object.create(h)]) {
    await assert.rejects(verifyPreliminaryReviewHandoff(bad,e),/review handoff/);
  }
  const getter={...h};
  Object.defineProperty(getter,'notice',{get(){throw new Error('must not invoke accessor');}});
  await assert.rejects(verifyPreliminaryReviewHandoff(getter,e),/mismatched/);
});
