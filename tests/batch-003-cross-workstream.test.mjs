import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePreliminaryAgriculturalGable } from '../dist/analysis/src/agricultural-gable-analysis.js';
import { createPreliminaryMaterialsReport } from '../dist/fabrication/src/preliminary-materials.js';
import { createPreliminaryMaterialsTraceabilityManifest, fingerprintPreliminaryMaterialsSource,
  verifyPreliminaryMaterialsTraceability } from '../dist/fabrication/src/preliminary-materials-traceability.js';

test('a solved agricultural subset exports only source-bound preliminary geometry, not its loading or release claims', async () => {
  const solved = analyzePreliminaryAgriculturalGable({roof:{family:'agricultural',spanFt:30,pitchRisePer12:4},
    areaIn2:4,elasticModulusPsi:1e6,loadCase:{id:'test-only',description:'synthetic',
      jointLoads:[{nodeId:'Q1',fyLb:-400}]}});
  const model=solved.model;
  const snapshot=createPreliminaryMaterialsReport('test-ag','review-1',model);
  const manifest=await createPreliminaryMaterialsTraceabilityManifest(snapshot);
  const expected={designId:'test-ag',revisionId:'review-1',sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(model)};
  const fromWire=await verifyPreliminaryMaterialsTraceability(JSON.parse(JSON.stringify(snapshot)),
    JSON.parse(JSON.stringify(manifest)),expected);
  assert.equal(fromWire.notice,'NOT FOR FABRICATION');
  assert.equal(fromWire.fabricationAuthorized,false);
  assert.equal(solved.fabricationAuthorized,false);
  assert.equal(snapshot.modelMemberCount,13);
  assert.equal('loads' in snapshot,false);
  assert.equal('supports' in snapshot,false);
  const shifted={...model,nodes:model.nodes.map(n=>({...n,x:n.x+5}))};
  const altered=createPreliminaryMaterialsReport(expected.designId,expected.revisionId,shifted);
  assert.deepEqual(altered.members,snapshot.members);
  await assert.rejects(verifyPreliminaryMaterialsTraceability(altered,
    await createPreliminaryMaterialsTraceabilityManifest(altered),expected),/identity|geometry/i);
});
