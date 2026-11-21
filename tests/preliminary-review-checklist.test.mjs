import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {createPreliminaryMaterialsTraceabilityManifest,fingerprintPreliminaryMaterialsSource} from '../dist/fabrication/src/preliminary-materials-traceability.js';
import {createPreliminarySchematicReview} from '../dist/fabrication/src/preliminary-schematic-review.js';
import {createPreliminaryReviewChecklist,verifyPreliminaryReviewChecklist} from '../dist/fabrication/src/preliminary-review-checklist.js';

async function rev(revisionId,scale=1) {
  const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:120*scale,y:48*scale}],bars:[{id:'AB',a:'A',b:'B'}]};
  const expected={designId:'design',revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(model)};
  const snapshot=createPreliminaryMaterialsReport(expected.designId,revisionId,model);
  const evidence={snapshot,expected,traceabilityManifest:await createPreliminaryMaterialsTraceabilityManifest(snapshot)};
  return {evidence,savedSchematic:await createPreliminarySchematicReview(evidence)};
}
const persisted=value=>JSON.parse(JSON.stringify(value));

test('compact checklist prioritizes actual IDs even if uniform resizing is hidden by normalized views',async()=>{
  const from=await rev('r1'),to=await rev('r2',2);
  const checklist=await createPreliminaryReviewChecklist(from,to);
  assert.equal(checklist.comparison,'MODEL_CHANGED_VIEW_MATCHES');
  assert.equal(checklist.from.schematicSvgSha256,checklist.to.schematicSvgSha256);
  assert.notEqual(checklist.from.sourceGeometrySha256,checklist.to.sourceGeometrySha256);
  assert.deepEqual(checklist.counts,{joints:{added:0,removed:0,changed:1},members:{added:0,removed:0,changed:1}});
  assert.deepEqual(checklist.operatorChecks,[{code:'CHANGED_JOINT_IDS',ids:['B']},{code:'CHANGED_MEMBER_IDS',ids:['AB']},
    {code:'VIEW_MASKS_MODEL_CHANGE',ids:[]}]);
  assert.equal(checklist.notice,'NOT FOR FABRICATION');
  assert.equal(checklist.fabricationAuthorized,false);
  assert.equal(Object.hasOwn(checklist.from,'drawingSvg'),false);
  assert.deepEqual(await verifyPreliminaryReviewChecklist(persisted(checklist),from,to),checklist);
});

test('unchanged schematic still excludes structural, stock, cut, press, machine and release decisions',async()=>{
  const from=await rev('r1'),to=await rev('r2');
  const checklist=await createPreliminaryReviewChecklist(from,to);
  assert.equal(checklist.comparison,'NO_SCHEMATIC_CHANGE');
  assert.deepEqual(checklist.operatorChecks,[]);
  assert.deepEqual(checklist.excluded,['STRUCTURAL_SIGNOFF','STOCK_AND_CUTS','PRESS_MACHINE_AND_RELEASE']);
  for(const spoof of [
    {...checklist,excluded:[]},{...checklist,fabricationAuthorized:true},{...checklist,cutList:[]},
    {...checklist,to:{...checklist.to,machineProgram:'release'}},{...checklist,schemaVersion:'v2'},
  ]) await assert.rejects(verifyPreliminaryReviewChecklist(spoof,from,to),/verified preliminary review evidence/);
});

test('rejects legitimate but stale checklist and attempts to erase verified review checks',async()=>{
  const from=await rev('r1'),to=await rev('r2',2),later=await rev('r3',2);
  const checklist=await createPreliminaryReviewChecklist(from,to);
  await assert.rejects(verifyPreliminaryReviewChecklist(checklist,from,later),/verified preliminary review evidence/);
  await assert.rejects(verifyPreliminaryReviewChecklist({...checklist,operatorChecks:[]},from,to),/verified preliminary review evidence/);
  await assert.rejects(createPreliminaryReviewChecklist(from,{...to,savedSchematic:from.savedSchematic}),/bound revision/);
});
