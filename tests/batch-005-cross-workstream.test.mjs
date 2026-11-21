import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateExplicitNodalLoadChannels } from '../dist/analysis/src/load-source-aggregation.js';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';
import { evaluateFabricationRelease } from '../dist/contracts/src/release.js';
import { createPreliminaryMaterialsReport } from '../dist/fabrication/src/preliminary-materials.js';
import { createPreliminaryMaterialsTraceabilityManifest, fingerprintPreliminaryMaterialsSource } from '../dist/fabrication/src/preliminary-materials-traceability.js';
import { createPreliminaryReviewHandoff, verifyPreliminaryReviewHandoff } from '../dist/fabrication/src/preliminary-review-handoff.js';

test('a solved signed case yields a source-bound external QA identity, never design data or release', async () => {
  const nodes = [{ id:'L',x:0,y:0 }, { id:'P',x:96,y:48 }, { id:'R',x:144,y:0 }];
  const bars = [['base','L','R'],['left','L','P'],['right','P','R']].map(([id,a,b])=>({id,a,b,areaIn2:1,elasticModulusPsi:1e6}));
  const channels = aggregateExplicitNodalLoadChannels({nodes},[
    {id:'a',provenance:'first synthetic downward force',loads:[{nodeId:'P',fyLb:-900}]},
    {id:'b',provenance:'second synthetic upward force',loads:[{nodeId:'P',fyLb:300}]},
  ]);
  const model = {nodes,bars,loads:channels.jointLoads,supports:[{nodeId:'L',fixX:true,fixY:true},{nodeId:'R',fixX:false,fixY:true}]};
  const solved = analyzePinJointedTruss(model);
  assert.ok(Math.abs(solved.reactionLb.R.y-400)<1e-8);
  assert.ok(Math.abs(solved.reactionLb.L.y-200)<1e-8);
  const source={nodes,bars}, designId='qa-only', revisionId='r1';
  const snapshot=createPreliminaryMaterialsReport(designId,revisionId,source);
  const expected={designId,revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(source)};
  const trusted={snapshot,expected,traceabilityManifest:await createPreliminaryMaterialsTraceabilityManifest(snapshot)};
  const handoff=await createPreliminaryReviewHandoff(trusted);
  assert.equal(handoff.fabricationAuthorized,false);
  assert.equal(handoff.notice,'NOT FOR FABRICATION');
  assert.equal(handoff.blockedUse,'NO_STOCK_CUT_PRESS_MACHINE_OR_RELEASE_USE');
  for(const field of ['jointLoads','reactionLb','members','bars','cutList','pressRecipe']) assert.ok(!(field in handoff));
  assert.deepEqual(await verifyPreliminaryReviewHandoff(JSON.parse(JSON.stringify(handoff)),trusted),handoff);
  await assert.rejects(verifyPreliminaryReviewHandoff({...handoff,revisionId:'r2'},trusted),/mismatched/);
  assert.equal(evaluateFabricationRelease({designId,revisionId,status:handoff.status}).allowed,false);
});
