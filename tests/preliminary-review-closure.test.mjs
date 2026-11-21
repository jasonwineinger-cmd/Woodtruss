import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {createPreliminaryMaterialsTraceabilityManifest,fingerprintPreliminaryMaterialsSource} from '../dist/fabrication/src/preliminary-materials-traceability.js';
import {createPreliminarySchematicReview} from '../dist/fabrication/src/preliminary-schematic-review.js';
import {createPreliminaryReviewChecklist} from '../dist/fabrication/src/preliminary-review-checklist.js';
import {createPreliminaryReviewReceipt,preparePreliminaryReviewReceipt} from '../dist/fabrication/src/preliminary-review-receipt.js';
import {summarizePreliminaryReviewClosure,verifyPreliminaryReviewClosure} from '../dist/fabrication/src/preliminary-review-closure.js';

async function view(revisionId,scale) {
  const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:120*scale,y:48*scale}],bars:[{id:'AB',a:'A',b:'B'}]};
  const expected={designId:'design',revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(model)};
  const snapshot=createPreliminaryMaterialsReport(expected.designId,revisionId,model);
  const evidence={snapshot,expected,traceabilityManifest:await createPreliminaryMaterialsTraceabilityManifest(snapshot)};
  return {evidence,savedSchematic:await createPreliminarySchematicReview(evidence)};
}
async function job(toId='r2',scale=2) {
  const from=await view('r1',1),to=await view(toId,scale);
  const evidence={from,to,checklist:await createPreliminaryReviewChecklist(from,to)};
  const prompt=await preparePreliminaryReviewReceipt(evidence);
  const claim={useScope:prompt.useScope,checklistSha256:prompt.checklistSha256,acknowledgedChecks:prompt.checks.slice(0,1)};
  return {evidence,prompt,claim,receipt:await createPreliminaryReviewReceipt(evidence,claim)};
}
const persisted=x=>JSON.parse(JSON.stringify(x));

test('reports exact review session and currently pending items rather than approval',async()=>{
  const j=await job();
  const summary=await summarizePreliminaryReviewClosure(j.receipt,j.evidence,j.claim);
  assert.equal(summary.schemaVersion,'woodtruss.preliminary-review-closure.v1');
  assert.equal(summary.state,'REVIEW_CHECKS_PENDING');
  assert.equal(summary.useScope,j.prompt.useScope);
  assert.equal(summary.designId,'design');
  assert.equal(summary.fromRevisionId,'r1');
  assert.equal(summary.toRevisionId,'r2');
  assert.equal(summary.checklistSha256,j.prompt.checklistSha256);
  assert.equal(summary.acknowledgedItemCount,1);
  assert.equal(summary.checklistItemCount,j.prompt.checks.length);
  assert.deepEqual(summary.pendingChecks,j.prompt.checks.slice(1));
  assert.deepEqual(summary.exclusions,['STRUCTURAL_SIGNOFF','STOCK_AND_CUTS','PRESS_MACHINE_AND_RELEASE']);
  assert.deepEqual(await verifyPreliminaryReviewClosure(persisted(summary),j.receipt,j.evidence,j.claim),summary);
});

test('distinguishes fully acknowledged and empty checklists without permitting manufacture',async()=>{
  const j=await job(),fullClaim={...j.claim,acknowledgedChecks:j.prompt.checks};
  const complete=await summarizePreliminaryReviewClosure(await createPreliminaryReviewReceipt(j.evidence,fullClaim),j.evidence,fullClaim);
  assert.equal(complete.state,'ALL_CHECKS_ACKNOWLEDGED_NOT_APPROVED');
  assert.equal(complete.acknowledgedItemCount,complete.checklistItemCount);
  const empty=await job('empty',1);
  const noChecks=await summarizePreliminaryReviewClosure(empty.receipt,empty.evidence,empty.claim);
  assert.equal(noChecks.state,'NO_CHECKS_LISTED_NOT_APPROVED');
  assert.equal(noChecks.checklistItemCount,0);
  for(const summary of [complete,noChecks]) {
    assert.deepEqual(summary.pendingChecks,[]);
    assert.equal(summary.reviewerIdentityVerified,false);
    assert.equal(summary.engineeringSignoffVerified,false);
    assert.equal(summary.fabricationAuthorized,false);
    assert.match(summary.notice,/NOT FOR FABRICATION/);
  }
});

test('rejects forged closure, receipt and stale paired evidence',async()=>{
  const j=await job(),other=await job('r3');
  const summary=await summarizePreliminaryReviewClosure(j.receipt,j.evidence,j.claim);
  for (const bad of [
    {...summary,pendingChecks:[]},
    {...summary,state:'ALL_CHECKS_ACKNOWLEDGED_NOT_APPROVED'},
    {...summary,fabricationAuthorized:true},
    {...summary,exclusions:[]},
    {...summary,machineProgram:'start'},
  ]) await assert.rejects(verifyPreliminaryReviewClosure(bad,j.receipt,j.evidence,j.claim),/verified review receipt/);
  await assert.rejects(verifyPreliminaryReviewClosure(summary,other.receipt,other.evidence,other.claim),/verified review receipt/);
  await assert.rejects(summarizePreliminaryReviewClosure({...j.receipt,pendingChecks:[]},j.evidence,j.claim),/acknowledged preliminary/);
});
