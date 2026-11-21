import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {createPreliminaryMaterialsTraceabilityManifest,fingerprintPreliminaryMaterialsSource} from '../dist/fabrication/src/preliminary-materials-traceability.js';
import {createPreliminarySchematicReview,verifyPreliminarySchematicReview} from '../dist/fabrication/src/preliminary-schematic-review.js';

const model=(y=57)=>({
  nodes:[{id:'A',x:0,y:0},{id:'B<script>',x:120,y},{id:'C',x:240,y:0}],
  bars:[{id:'AB<path>',a:'A',b:'B<script>'},{id:'BC',a:'B<script>',b:'C'},{id:'AC',a:'A',b:'C'}],
});
const hash=s=>createHash('sha256').update(s,'utf8').digest('hex');
async function evidence(revisionId='r2',geometry=model()){
  const expected={designId:'design',revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(geometry)};
  const snapshot=createPreliminaryMaterialsReport(expected.designId,revisionId,geometry);
  return {snapshot,expected,traceabilityManifest:await createPreliminaryMaterialsTraceabilityManifest(snapshot)};
}

test('watermarked schematic uses only viewport units and derives repeatably from the bound revision',async()=>{
  const e=await evidence();
  const saved=await createPreliminarySchematicReview(e);
  assert.equal(saved.schemaVersion,'woodtruss.preliminary-schematic-review.v1');
  assert.equal(saved.format,'NORMALIZED_VECTOR_REVIEW_NO_DIMENSIONS');
  assert.equal(saved.fabricationAuthorized,false);
  assert.equal(saved.schematicSvgSha256,hash(saved.drawingSvg));
  assert.equal(saved.sourceGeometrySha256,e.expected.sourceGeometrySha256);
  assert.match(saved.drawingSvg,/>PRELIMINARY - NOT FOR FABRICATION<\/text>/);
  assert.equal((saved.drawingSvg.match(/<line /g)??[]).length,3);
  assert.equal((saved.drawingSvg.match(/<circle /g)??[]).length,3);
  assert.doesNotMatch(saved.drawingSvg,/<script|memberId|lengthIn|AB<path>|B<script>/);
  assert.deepEqual(await verifyPreliminarySchematicReview(JSON.parse(JSON.stringify(saved)),e),saved);
  const reversed=model();
  reversed.nodes.reverse(); reversed.bars.reverse();
  assert.deepEqual(await createPreliminarySchematicReview(await evidence('r2',reversed)),saved);
});

test('rejects a stale revision or source swap even if a sender regenerates its own valid schematic',async()=>{
  const e=await evidence(), stale=await evidence('r1'), swapped=await evidence('r2',model(-57));
  assert.equal((await createPreliminarySchematicReview(stale)).drawingSvg,(await createPreliminarySchematicReview(e)).drawingSvg);
  await assert.rejects(verifyPreliminarySchematicReview(await createPreliminarySchematicReview(stale),e),/bound revision/);
  await assert.rejects(verifyPreliminarySchematicReview(await createPreliminarySchematicReview(swapped),e),/bound revision/);
  await assert.rejects(createPreliminarySchematicReview({...swapped,expected:e.expected}),/source geometry/);
});

test('rejects replaced SVG with a recomputed digest, removed watermarks, future version, and release fields',async()=>{
  const e=await evidence(), saved=await createPreliminarySchematicReview(e);
  const injected=saved.drawingSvg.replace('</svg>','<script>alert(1)</script></svg>');
  const stripped=saved.drawingSvg.replaceAll('PRELIMINARY - NOT FOR FABRICATION','APPROVED');
  for(const bad of [
    {...saved,drawingSvg:injected,schematicSvgSha256:hash(injected)},
    {...saved,drawingSvg:stripped,schematicSvgSha256:hash(stripped)},
    {...saved,schemaVersion:'v2'}, {...saved,stockList:[]}, {...saved,fabricationAuthorized:true},
  ]) await assert.rejects(verifyPreliminarySchematicReview(bad,e),/bound revision/);
});
