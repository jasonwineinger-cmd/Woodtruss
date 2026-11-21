import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {createPreliminaryMaterialsTraceabilityManifest,fingerprintPreliminaryMaterialsSource} from '../dist/fabrication/src/preliminary-materials-traceability.js';
import {createPreliminarySchematicReview} from '../dist/fabrication/src/preliminary-schematic-review.js';
import {createPreliminaryReviewChecklist} from '../dist/fabrication/src/preliminary-review-checklist.js';
import {createPreliminaryReviewReceipt,preparePreliminaryReviewReceipt,verifyPreliminaryReviewReceipt} from '../dist/fabrication/src/preliminary-review-receipt.js';

const clone=value=>JSON.parse(JSON.stringify(value));
async function revision(revisionId,scale) {
  const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:120*scale,y:48*scale}],bars:[{id:'AB',a:'A',b:'B'}]};
  const expected={designId:'design',revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(model)};
  const snapshot=createPreliminaryMaterialsReport(expected.designId,revisionId,model);
  const evidence={snapshot,expected,traceabilityManifest:await createPreliminaryMaterialsTraceabilityManifest(snapshot)};
  return {evidence,savedSchematic:await createPreliminarySchematicReview(evidence)};
}
async function job(toId='r2',toScale=2) {
  const from=await revision('r1',1),to=await revision(toId,toScale);
  const evidence={from,to,checklist:clone(await createPreliminaryReviewChecklist(from,to))};
  const prompt=await preparePreliminaryReviewReceipt(evidence);
  return {evidence,prompt,claim:{useScope:prompt.useScope,checklistSha256:prompt.checklistSha256,acknowledgedChecks:prompt.checks.slice(0,1)}};
}

test('binds a partial operator acknowledgment to exact review scope, revision and affected IDs',async()=>{
  const {evidence,prompt,claim}=await job();
  const receipt=await createPreliminaryReviewReceipt(evidence,clone(claim));
  assert.equal(receipt.schemaVersion,'woodtruss.preliminary-review-receipt.v1');
  assert.equal(receipt.checklistSha256,prompt.checklistSha256);
  assert.equal(receipt.useScope,'OFFLINE_SCHEMATIC_REVIEW_ACKNOWLEDGMENT_ONLY');
  assert.equal(receipt.designId,'design');
  assert.equal(receipt.fromRevisionId,'r1');
  assert.equal(receipt.toRevisionId,'r2');
  assert.deepEqual(receipt.acknowledgedChecks,[{code:'CHANGED_JOINT_IDS',ids:['B']}]);
  assert.deepEqual(receipt.pendingChecks,prompt.checks.slice(1));
  assert.equal(receipt.disposition,'ACKNOWLEDGMENT_ONLY_NOT_SIGNOFF');
  assert.equal(receipt.engineeringSignoffVerified,false);
  assert.equal(receipt.fabricationAuthorized,false);
  assert.deepEqual(await verifyPreliminaryReviewReceipt(clone(receipt),evidence,clone(claim)),receipt);
});

test('rejects stale, invented, malformed, duplicate and production-scoped claims',async()=>{
  const {evidence,claim}=await job();
  const later=await job('r3');
  await assert.rejects(createPreliminaryReviewReceipt(later.evidence,claim),/digest mismatch/);
  for (const bad of [
    {...claim,useScope:'FABRICATION'}, {...claim,engineeringSignoffVerified:true},
    {...claim,acknowledgedChecks:[{code:'CHANGED_JOINT_IDS',ids:['AB']}]},
    {...claim,acknowledgedChecks:[{code:'UNKNOWN',ids:[]}]},
    {...claim,acknowledgedChecks:[claim.acknowledgedChecks[0],claim.acknowledgedChecks[0]]},
    {...claim,acknowledgedChecks:[{...claim.acknowledgedChecks[0],cutList:[]}]},
  ]) await assert.rejects(createPreliminaryReviewReceipt(evidence,bad));
});

test('full and no-change acknowledgment remain non-signoff; receipt cannot erase pending checks',async()=>{
  const {evidence,prompt,claim}=await job();
  const partial=await createPreliminaryReviewReceipt(evidence,claim);
  const full=await createPreliminaryReviewReceipt(evidence,{...claim,acknowledgedChecks:[...prompt.checks].reverse()});
  assert.deepEqual(full.pendingChecks,[]);
  assert.deepEqual(full.acknowledgedChecks,prompt.checks);
  assert.equal(full.engineeringSignoffVerified,false);
  await assert.rejects(verifyPreliminaryReviewReceipt(full,evidence,claim),/does not match/);
  for (const spoof of [{...partial,pendingChecks:[]},{...partial,fabricationAuthorized:true},{...partial,stock:[]}])
    await assert.rejects(verifyPreliminaryReviewReceipt(spoof,evidence,claim),/does not match/);
  const same=await job('same',1);
  const empty=await createPreliminaryReviewReceipt(same.evidence,same.claim);
  assert.deepEqual(empty.acknowledgedChecks,[]);
  assert.deepEqual(empty.pendingChecks,[]);
  assert.equal(empty.fabricationAuthorized,false);
});
