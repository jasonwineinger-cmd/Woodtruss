import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {createPreliminaryMaterialsTraceabilityManifest,fingerprintPreliminaryMaterialsSource} from '../dist/fabrication/src/preliminary-materials-traceability.js';
import {createPreliminarySchematicReview} from '../dist/fabrication/src/preliminary-schematic-review.js';
import {comparePreliminarySchematicReviews} from '../dist/fabrication/src/preliminary-schematic-comparison.js';

async function revision(revisionId,{scale=1,raise=48,designId='design'}={}) {
  const geometry={
    nodes:[{id:'A',x:0,y:0},{id:'B',x:120*scale,y:raise*scale},{id:'C',x:240*scale,y:0}],
    bars:[{id:'AB',a:'A',b:'B'},{id:'AC',a:'A',b:'C'},{id:'BC',a:'B',b:'C'}],
  };
  const snapshot=createPreliminaryMaterialsReport(designId,revisionId,geometry);
  const expected={designId,revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(geometry)};
  const evidence={snapshot,expected,traceabilityManifest:await createPreliminaryMaterialsTraceabilityManifest(snapshot)};
  const savedSchematic=JSON.parse(JSON.stringify(await createPreliminarySchematicReview(evidence)));
  return {evidence,savedSchematic};
}

test('reports directional model and visual changes only after both revision drawings replay',async()=>{
  const r1=await revision('r1'),r2=await revision('r2',{raise:60});
  const result=await comparePreliminarySchematicReviews(r1,r2);
  assert.equal(result.schemaVersion,'woodtruss.preliminary-schematic-comparison.v1');
  assert.equal(result.from.revisionId,'r1');
  assert.equal(result.to.revisionId,'r2');
  assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized,false);
  assert.equal(result.modelDecision,'SCHEMATIC_MODEL_CHANGED');
  assert.equal(result.normalizedDrawingDecision,'NORMALIZED_DRAWINGS_DIFFER');
  assert.deepEqual(result.joints.changedIds,['B']);
  assert.deepEqual(result.members.changedIds,['AB','BC']);
  assert.match(result.from.drawingSvg,/NOT FOR FABRICATION/);
  assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.from)&&Object.isFrozen(result.to));
});

test('separates drawing equality from scaled model changes and no-change revisions',async()=>{
  const r1=await revision('r1');
  const scaled=await comparePreliminarySchematicReviews(r1,await revision('scaled',{scale:2}));
  assert.equal(scaled.modelDecision,'SCHEMATIC_MODEL_CHANGED');
  assert.equal(scaled.normalizedDrawingDecision,'NORMALIZED_DRAWINGS_MATCH');
  assert.deepEqual(scaled.members.changedIds,['AB','AC','BC']);
  const same=await comparePreliminarySchematicReviews(r1,await revision('same'));
  assert.equal(same.modelDecision,'NO_SCHEMATIC_MODEL_CHANGE');
  assert.equal(same.normalizedDrawingDecision,'NORMALIZED_DRAWINGS_MATCH');
  assert.equal(same.fabricationAuthorized,false);
});

test('rejects either stale or forged drawing, same revision and cross-design comparisons',async()=>{
  const r1=await revision('r1'),r2=await revision('r2');
  await assert.rejects(comparePreliminarySchematicReviews(r1,r1),/Distinct revision/);
  await assert.rejects(comparePreliminarySchematicReviews(r1,await revision('r2',{designId:'other'})),/different designs/);
  await assert.rejects(comparePreliminarySchematicReviews({...r1,savedSchematic:r2.savedSchematic},r2),/bound revision/);
  const injected=r2.savedSchematic.drawingSvg.replace('</svg>','<foreignObject/></svg>');
  const fake={...r2.savedSchematic,drawingSvg:injected,schematicSvgSha256:createHash('sha256').update(injected).digest('hex')};
  await assert.rejects(comparePreliminarySchematicReviews(r1,{...r2,savedSchematic:fake}),/bound revision/);
});
