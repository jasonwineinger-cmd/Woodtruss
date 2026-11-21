import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {
  createPreliminaryMaterialsTraceabilityManifest, fingerprintPreliminaryMaterialsSource,
  verifyPreliminaryMaterialsTraceability,
} from '../dist/fabrication/src/preliminary-materials-traceability.js';

const model={nodes:[{id:'B',x:3,y:4},{id:'A',x:0,y:-0}],bars:[{id:'AB',a:'A',b:'B'}]};
const snapshot=(geometry=model,design='design',rev='r1')=>JSON.parse(JSON.stringify(createPreliminaryMaterialsReport(design,rev,geometry)));
const expected=async()=>({designId:'design',revisionId:'r1',sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(model)});

test('independent source digest and canonical snapshot agree on the versioned UTF-8 geometry encoding',async()=>{
  const identity=await expected();
  const vector='["woodtruss.schematic-model-geometry.v1","in",[["A",0,0],["B",3,4]],[["AB","A","B"]]]';
  assert.equal(identity.sourceGeometrySha256,createHash('sha256').update(vector,'utf8').digest('hex'));
  assert.equal(await fingerprintPreliminaryMaterialsSource({...model,nodes:[...model.nodes].reverse()}),identity.sourceGeometrySha256);
  const report=snapshot();
  const manifest=await createPreliminaryMaterialsTraceabilityManifest(report);
  const persisted=JSON.parse(JSON.stringify(manifest));
  assert.deepEqual(await verifyPreliminaryMaterialsTraceability(report,persisted,identity),manifest);
  assert.equal(manifest.schemaVersion,'woodtruss.preliminary-materials-traceability.v1');
  assert.equal(manifest.notice,'NOT FOR FABRICATION');
  assert.equal(manifest.fabricationAuthorized,false);
  assert.equal(Object.isFrozen(manifest),true);
});

test('rejects the wrong design, revision, or fully self-consistent equal-length geometry substitution',async()=>{
  const identity=await expected();
  for (const report of [snapshot(model,'another'),snapshot(model,'design','r2')]) {
    await assert.rejects(verifyPreliminaryMaterialsTraceability(report,await createPreliminaryMaterialsTraceabilityManifest(report),identity),/design or revision/);
  }
  const changed=snapshot({...model,nodes:[{...model.nodes[0],y:-4},model.nodes[1]]});
  assert.equal(changed.members[0].centerlineLengthIn,snapshot().members[0].centerlineLengthIn);
  await assert.rejects(verifyPreliminaryMaterialsTraceability(changed,await createPreliminaryMaterialsTraceabilityManifest(changed),identity),/source geometry/);
  const reversed=snapshot({...model,bars:[{id:'AB',a:'B',b:'A'}]});
  assert.notEqual((await createPreliminaryMaterialsTraceabilityManifest(reversed)).sourceGeometrySha256,identity.sourceGeometrySha256);
});

test('fails closed on malformed identity, substituted report or unrecognized manifest fields',async()=>{
  const report=snapshot(), identity=await expected();
  const manifest=await createPreliminaryMaterialsTraceabilityManifest(report);
  const wrong=[{...manifest,fabricationAuthorized:true},{...manifest,cutList:[]},{...manifest,schemaVersion:'v2'},
    {...manifest,sourceGeometrySha256:'a'.repeat(64)},Object.create(manifest)];
  for (const candidate of wrong) {
    await assert.rejects(verifyPreliminaryMaterialsTraceability(report,candidate,identity),/manifest|JSON record/);
  }
  await assert.rejects(verifyPreliminaryMaterialsTraceability({...report,machineData:[]},manifest,identity),/canonical/);
  await assert.rejects(verifyPreliminaryMaterialsTraceability(report,manifest,{...identity,sourceGeometrySha256:'untrusted'}),/trusted source/);
});
