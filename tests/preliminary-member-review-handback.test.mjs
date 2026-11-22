import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {createPreliminaryMaterialsTraceabilityManifest,fingerprintPreliminaryMaterialsSource} from '../dist/fabrication/src/preliminary-materials-traceability.js';
import {createPreliminarySchematicReview} from '../dist/fabrication/src/preliminary-schematic-review.js';
import {createPreliminaryReviewChecklist} from '../dist/fabrication/src/preliminary-review-checklist.js';
import {createPreliminaryReviewReceipt,preparePreliminaryReviewReceipt} from '../dist/fabrication/src/preliminary-review-receipt.js';
import {createPreliminaryMemberReviewHandback} from '../dist/fabrication/src/preliminary-member-review-handback.js';

async function view(revisionId,reversed=false) {
  const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:48},{id:'C',x:240,y:0}],
    bars:[{id:'AB',a:'A',b:reversed?'C':'B'},{id:'BC',a:'B',b:'C'}]};
  const expected={designId:'design',revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(model)};
  const snapshot=createPreliminaryMaterialsReport(expected.designId,revisionId,model);
  const evidence={snapshot,expected,traceabilityManifest:await createPreliminaryMaterialsTraceabilityManifest(snapshot)};
  return {evidence,savedSchematic:await createPreliminarySchematicReview(evidence)};
}
async function job(target='r2') {
  const from=await view('r1'),to=await view(target,true);
  const evidence={from,to,checklist:await createPreliminaryReviewChecklist(from,to)};
  const prompt=await preparePreliminaryReviewReceipt(evidence);
  const claim={useScope:prompt.useScope,checklistSha256:prompt.checklistSha256,acknowledgedChecks:[]};
  return {evidence,prompt,claim,receipt:await createPreliminaryReviewReceipt(evidence,claim)};
}

test('returns changed and unchanged connection identities with exact pending scope',async()=>{
  const j=await job();
  const result=await createPreliminaryMemberReviewHandback(j.evidence,j.receipt,j.claim,['BC','AB']);
  assert.equal(result.schemaVersion,'woodtruss.preliminary-member-review-handback.v1');
  assert.equal(result.checklistSha256,j.prompt.checklistSha256);
  assert.equal(result.prior.revisionId,'r1');
  assert.equal(result.next.revisionId,'r2');
  assert.equal(result.closureState,'REVIEW_CHECKS_PENDING');
  assert.deepEqual(result.members.map(m=>[m.modelMemberId,m.relation,m.memberChecklistState,m.physicalContinuityVerified]),[
    ['AB','ENDPOINT_IDENTITIES_CHANGED','PENDING_REVIEW',false],
    ['BC','SAME_SCHEMATIC_ENDPOINTS_ONLY','NOT_LISTED_IN_MEMBER_CHANGE_CHECK',false],
  ]);
  assert.deepEqual(result.pendingChecks,j.prompt.checks);
  assert.equal(result.fabricationAuthorized,false);
  assert.match(result.notice,/NOT FOR FABRICATION/);
});

test('an acknowledged member is still not approved for physical reuse, sign-off or fabrication',async()=>{
  const j=await job();
  const claim={...j.claim,acknowledgedChecks:j.prompt.checks};
  const receipt=await createPreliminaryReviewReceipt(j.evidence,claim);
  const result=await createPreliminaryMemberReviewHandback(j.evidence,receipt,claim,['AB']);
  assert.equal(result.members[0].memberChecklistState,'ACKNOWLEDGED_NOT_APPROVED');
  assert.equal(result.members[0].physicalContinuityVerified,false);
  assert.equal(result.engineeringSignoffVerified,false);
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(result.pendingChecks,[]);
  assert.deepEqual(result.exclusions,['STRUCTURAL_SIGNOFF','STOCK_AND_CUTS','PRESS_MACHINE_AND_RELEASE']);
});

test('rejects stale receipt, wrong checklist, unknown selection and altered release fields',async()=>{
  const j=await job(),other=await job('r3');
  await assert.rejects(createPreliminaryMemberReviewHandback(other.evidence,j.receipt,j.claim,['AB']),/digest mismatch/);
  await assert.rejects(createPreliminaryMemberReviewHandback({...j.evidence,checklist:other.evidence.checklist},j.receipt,j.claim,['AB']));
  await assert.rejects(createPreliminaryMemberReviewHandback(j.evidence,j.receipt,j.claim,['UNKNOWN']),/not found/);
  await assert.rejects(createPreliminaryMemberReviewHandback(j.evidence,{...j.receipt,machineProgram:'go'},j.claim,['AB']),/does not match/);
});
