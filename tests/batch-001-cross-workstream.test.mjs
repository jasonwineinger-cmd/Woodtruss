import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePreliminaryCommonTruss } from '../dist/analysis/src/common.js';
import { analyzeExplicitLoadCombinations } from '../dist/analysis/src/explicit-load-combinations.js';
import { inventoryScenarioConnectorPlateDemands } from '../dist/connections/src/plate-screen.js';
import { createPreliminaryMaterialsReport } from '../dist/fabrication/src/preliminary-materials.js';
import { evaluateFabricationRelease } from '../dist/contracts/src/release.js';

test('one common model retains exact member identities across signed case review and schematic material export without releasing', () => {
  const { model } = analyzePreliminaryCommonTruss({ roof: { family: 'common', spanFt: 30, pitchRisePer12: 6 },
    areaIn2: 2, elasticModulusPsi: 1e6, ridgeLoadLb: 0 });
  const run = analyzeExplicitLoadCombinations(model, [
    { id: 'down', description: 'Synthetic benchmark only', provenance: 'Test fixture only', jointLoads: [{ nodeId:'R', fyLb:-800 }] },
    { id: 'up', description: 'Synthetic benchmark only', provenance: 'Test fixture only', jointLoads: [{ nodeId:'R', fyLb:200 }] },
  ], [
    { id:'G', description:'Synthetic downward', provenance:'Test case', terms:[{ caseId:'down', factor:1 }] },
    { id:'U', description:'Synthetic upward', provenance:'Test case', terms:[{ caseId:'up', factor:1 }] },
  ]);
  const plate = inventoryScenarioConnectorPlateDemands(model.nodes,
    model.bars.map(({id,a,b}) => ({id,start:a,end:b})), [],
    run.cases.map(({id,result}) => ({id,axialForceLb:result.axialForceLb})));
  const report = createPreliminaryMaterialsReport('test-design', 'test-revision', model);
  const expectedIds = model.bars.map(({id})=>id).sort();
  assert.deepEqual(report.members.map(m=>m.memberId), expectedIds);
  assert.deepEqual([...new Set(plate.flatMap(j=>j.incidentMemberIds))].sort(), expectedIds);
  for (const joint of plate) assert.deepEqual(joint.scenarios.map(s=>s.scenarioId), ['G','U']);
  const ridge = plate.find(j=>j.jointId==='R');
  assert.ok(ridge?.scenarios[0].members.some((member,i) =>
    Math.abs(member.axialLb)>1 && member.axialLb*ridge.scenarios[1].members[i].axialLb<0));
  assert.ok(plate.every(j=>j.fabricationAuthorized===false));
  assert.equal(report.fabricationAuthorized,false);
  assert.equal(report.notice,'NOT FOR FABRICATION');
  const decision = evaluateFabricationRelease({designId:report.designId,revisionId:report.revisionId,status:'PRELIMINARY_NOT_ENGINEERED'});
  assert.equal(decision.allowed,false);
});
