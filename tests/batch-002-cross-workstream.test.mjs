import assert from 'node:assert/strict';
import test from 'node:test';
import { generateMonoTopology } from '../dist/geometry/src/mono.js';
import { distributeExplicitLineLoad } from '../dist/analysis/src/distributed-line-load.js';
import { analyzePreliminaryMonoTruss } from '../dist/analysis/src/mono-analysis.js';
import { capturePlateForceEvidence, inventoryBoundConnectorPlateDemands } from '../dist/connections/src/plate-model-binding.js';
import { createPreliminaryMaterialsReport } from '../dist/fabrication/src/preliminary-materials.js';
import { parsePreliminaryMaterialsSnapshot } from '../dist/fabrication/src/preliminary-materials-revisions.js';

test('a partial illustrative mono load stays bound across preliminary analysis, connection review and material snapshot', () => {
  const roof = {family:'mono',spanFt:30,pitchRisePer12:6};
  const topology = generateMonoTopology(roof);
  const nodal = distributeExplicitLineLoad({
    nodes:topology.joints.map(j=>({id:j.id,...j.position})),
    bars:topology.members.map(m=>({id:m.id,a:m.start,b:m.end,areaIn2:2,elasticModulusPsi:1e6})),
  },{orderedChordNodeIds:['L','T1','T2','T3','T4'],fromXIn:100,toXIn:250,
    fromFyLbPerIn:-2,toFyLbPerIn:-2,provenance:'synthetic integration fixture'});
  const solved = analyzePreliminaryMonoTruss({roof,areaIn2:2,elasticModulusPsi:1e6,
    loadCase:{id:'fixture-partial',description:'synthetic partial load',jointLoads:nodal.jointLoads}});
  const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
  // -300 lb acts at the midpoint 175 in along a 360 in bearing span.
  close(solved.result.reactionLb.E.y,300*175/360);
  close(solved.result.reactionLb.L.y,300*(360-175)/360);
  const scenario={id:'fixture-partial',loads:solved.model.loads};
  const source={revision:'bench-r2',model:solved.model};
  const evidence = capturePlateForceEvidence(source,scenario);
  const demands = inventoryBoundConnectorPlateDemands(source,[scenario],[],[evidence]);
  const report = parsePreliminaryMaterialsSnapshot(JSON.parse(JSON.stringify(
    createPreliminaryMaterialsReport('mono-benchmark',source.revision,solved.model))));
  assert.deepEqual([...new Set(demands.flatMap(j=>j.incidentMemberIds))].sort(),report.members.map(m=>m.memberId));
  assert.ok(demands.every(j=>!j.fabricationAuthorized && j.sourceRevision===report.revisionId));
  assert.equal(report.fabricationAuthorized,false);
  assert.equal(solved.fabricationAuthorized,false);
  assert.throws(()=>inventoryBoundConnectorPlateDemands({...source,revision:'bench-r3'},[scenario],[],[evidence]),/revision/);
});
