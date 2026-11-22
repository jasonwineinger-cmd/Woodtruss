import test from 'node:test';
import assert from 'node:assert/strict';
import { generateScissorTopology } from '../dist/geometry/src/scissor.js';
import { studyScissorModeledThreeGaugeRestraint } from '../dist/analysis/src/scissor-modeled-three-gauge-restraint-study.js';

function fixture() {
  const roof = { family: 'scissor', spanFt: 50, pitchRisePer12: 6, bottomPitchRisePer12: 3 };
  return {
    modelId: 'synthetic-three-gauge-frame', modelRevision: 'R2',
    roof,
    memberAssignments: generateScissorTopology(roof).members.map(({ id, start, end }) => ({
      memberId: id, startNodeId: start, endNodeId: end,
      areaIn2: 5, secondMomentIn4: 23, elasticModulusPsi: 1300000,
      releaseStartRotation: false, releaseEndRotation: false,
    })),
    supports: [
      { nodeId: 'L', fixX: true, fixY: true, fixRotation: false },
      { nodeId: 'E', fixX: false, fixY: true, fixRotation: false },
    ],
    sources: [{ caseId: 'hand', sourceRef: 'Synthetic downward point',
      loads: [{ nodeId: 'Q1', fxLb: 0, fyLb: -120, momentLbIn: 0 }] }],
    combinations: [{ caseId: 'weighted', sourceRef: 'Synthetic explicit factor',
      terms: [{ caseId: 'hand', factor: 0.5 }] }],
    bearingNodeId: 'E', originNodeId: 'L', restraint: { kind: 'spring', stiffnessLbPerIn: 1000 },
    gauges: [{ gaugeId: 'west', nodeId: 'Q1' }, { gaugeId: 'center', nodeId: 'R' }, { gaugeId: 'east', nodeId: 'Q3' }],
  };
}

const study = studyScissorModeledThreeGaugeRestraint;
function rejects(change) {
  const input = fixture();
  change(input);
  assert.throws(() => study(input));
}
const near = (actual, expected, label) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-7, `${label}: ${actual} != ${expected}`);

test('accepted 50-ft authored model returns only modeled ordered gauges and exact bearing totals', () => {
  const input = fixture();
  const result = study(input);
  assert.equal(result.status, 'PRELIMINARY_MODELED_NOT_OBSERVED');
  assert.equal(result.fabricationAuthorized, false);
  assert.deepEqual(result.rows.map(row => row.caseId), ['weighted']);
  const [row] = result.rows;
  for (const projection of [row.unrestrained, row.restrained]) {
    assert.deepEqual(projection.gauges.map(({ gaugeId, nodeId }) => ({ gaugeId, nodeId })), input.gauges);
    near(projection.averageDownwardIn, projection.gauges.reduce((sum, g) => sum + g.downwardIn, 0) / 3, 'signed gauge mean');
  }
  assert.deepEqual(row.bearingVerticalReactionsLb.map(reaction => reaction.nodeId), ['L', 'E']);
  // The weight applies 60 lb down at a quarter span, so reactions are
  // 45 and 15 lb up regardless of the horizontal spring on the same datum.
  near(row.bearingVerticalReactionsLb[0].fyLb, 45, 'left bearing');
  near(row.bearingVerticalReactionsLb[1].fyLb, 15, 'right bearing');
  near(row.totalBearingReactionLb, 60, 'total vertical bearing reaction');
  assert.equal(Object.hasOwn(result, 'fit'), false);
});

test('rejects wrong or reversed gauge identity, duplicate IDs, and observed inputs', () => {
  [
    value => { value.gauges.reverse(); },
    value => { value.gauges[0].nodeId = 'B1'; },
    value => { value.gauges[1].nodeId = 'Q1'; },
    value => { value.gauges[1].gaugeId = value.gauges[0].gaugeId; },
    value => { value.gauges[0].observedDownwardIn = 0.5; },
    value => { value.gauges[0].distanceIn = 0.5; },
    value => { value.gauges.pop(); },
    value => { value.samples = [{ observedDownwardIn: 0.1 }]; },
    value => { value.fitWindow = {}; },
    value => { value.fittedStiffnessLbPerIn = 1000; },
    value => { value.fabricationAuthorized = true; },
  ].forEach(rejects);
});

test('holds invalid support, geometry, combinations, and unused source targets', () => {
  [
    value => { value.roof.spanFt = 50.001; },
    value => { value.bearingNodeId = 'L'; },
    value => { value.supports[1].fixX = true; },
    value => { value.supports[1] = { nodeId: 'E', freeDx: 1, freeDy: 0, fixRotation: false }; },
    value => { value.supports.push({ nodeId: 'R', fixX: false, fixY: true, fixRotation: false }); },
    value => { value.sources[0].loads[0].nodeId = 'not-in-frame'; },
    value => { value.combinations = []; },
    value => { value.combinations[0].terms[0].caseId = 'not-authored'; },
    value => { value.sources.push({ caseId: 'unused', sourceRef: 'Synthetic uncombined',
      loads: [], memberPointLoads: [{ memberId: 'top-L-Q1', stationIn: 200, fxLb: 0, fyLb: -10 }] }); },
  ].forEach(rejects);
});
