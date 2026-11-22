import test from 'node:test';
import assert from 'node:assert/strict';
import { generateScissorTopology } from '../dist/geometry/src/scissor.js';
import { compareScissorModeledAndObservedResponse } from '../dist/analysis/src/scissor-model-observed-comparison.js';

function fixture() {
  const roof = { family: 'scissor', spanFt: 30, pitchRisePer12: 6, bottomPitchRisePer12: 3 };
  const gauges = [{ gaugeId: 'model-west', nodeId: 'Q1' }, { gaugeId: 'model-ridge', nodeId: 'R' },
    { gaugeId: 'model-east', nodeId: 'Q3' }];
  const gaugeIds = ['bench-west', 'bench-ridge', 'bench-east'];
  const bearingIds = ['bench-left', 'bench-right'];
  const modeledInput = {
    modelId: 'synthetic-comparison', modelRevision: 'r1',
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
    sources: [{ caseId: 'quarter-load', sourceRef: 'Synthetic authored quarter load',
      loads: [{ nodeId: 'Q1', fxLb: 0, fyLb: -40, momentLbIn: 0 }] }],
    combinations: [1, 2, 3].map(i => ({ caseId: `case-${i}`, sourceRef: `Synthetic modeled level ${i}`,
      terms: [{ caseId: 'quarter-load', factor: i }] })),
    bearingNodeId: 'E', originNodeId: 'L', restraint: { kind: 'spring', stiffnessLbPerIn: 1600 }, gauges,
  };
  const observedInput = {
    specimenId: 'synthetic-specimen', testId: 'synthetic-run', sourceRef: 'Authored synthetic gauge-series for boundary testing',
    gaugeIds, bearingIds,
    // Only the vertical bearing resultants intentionally match hand statics
    // for this synthetic comparison; gauge data are separately authored.
    samples: [1, 2, 3].map(i => ({ stepId: `step-${i}`, downwardGaugeIn: [0.008 * i, 0.007 * i, 0.006 * i],
      verticalBearingReactionLb: [30 * i, 10 * i] })),
    fitWindow: { firstStepId: 'step-1', lastStepId: 'step-3' },
  };
  return {
    modeledInput, observedInput,
    scope: {
      protocolId: 'synthetic-protocol', reviewEvidenceId: 'review-1', specimenId: observedInput.specimenId,
      testId: observedInput.testId, observedSourceRef: observedInput.sourceRef,
      modelId: modeledInput.modelId, modelRevision: modeledInput.modelRevision, comparisonState: 'restrained',
      gaugePairs: gauges.map(({ gaugeId, nodeId }, i) => ({ observedGaugeId: gaugeIds[i],
        modeledGaugeId: gaugeId, nodeId, evidenceRef: `Gauge attestation ${i}` })),
      bearingPairs: ['L', 'E'].map((modeledNodeId, i) => ({ observedBearingId: bearingIds[i], modeledNodeId,
        evidenceRef: `Bearing attestation ${i}` })),
      stepPairs: [1, 2, 3].map(i => ({ stepId: `step-${i}`, caseId: `case-${i}`, evidenceRef: `Step attestation ${i}` })),
      maxReactionDifferenceLb: 1,
    },
  };
}
const compare = compareScissorModeledAndObservedResponse;
function rejects(change) {
  const input = fixture();
  change(input);
  assert.throws(() => compare(input));
}

test('a matched preliminary comparison keeps exact authored step and case identity', () => {
  const out = compare(fixture());
  assert.equal(out.status, 'PRELIMINARY_CORRESPONDENCE_ONLY');
  assert.equal(out.fabricationAuthorized, false);
  assert.deepEqual(out.rows.map(({ caseId, stepId }) => [caseId, stepId]),
    [['case-1', 'step-1'], ['case-2', 'step-2'], ['case-3', 'step-3']]);
  assert.ok(out.rows.every(row => row.bearingResidualLb.every(value => Math.abs(value) <= 1e-7)));
});

test('rejects missing attestation, stale scopes, and swaps rather than guessing correspondence', () => {
  [
    input => { delete input.scope.reviewEvidenceId; },
    input => { input.scope.gaugePairs[0].evidenceRef = ''; },
    input => { input.scope.bearingPairs[1].evidenceRef = ''; },
    input => { delete input.scope.stepPairs[2].evidenceRef; },
    input => { input.scope.modelRevision = 'r0'; },
    input => { input.scope.testId = 'foreign-run'; },
    input => { input.scope.observedSourceRef = 'different-source'; },
    input => { input.scope.gaugePairs.reverse(); },
    input => { input.scope.bearingPairs.reverse(); },
    input => { input.scope.stepPairs.reverse(); },
    input => { input.scope.stepPairs[1].stepId = input.scope.stepPairs[0].stepId; },
    input => { input.scope.stepPairs[1].caseId = input.scope.stepPairs[0].caseId; },
    input => { input.scope.stepPairs[2].caseId = 'absent'; },
    input => { input.scope.maxReactionDifferenceLb = -1; },
    input => { input.scope.maxReactionDifferenceLb = Infinity; },
  ].forEach(rejects);
});

test('later signed bearing disagreement holds all rows even when its total still agrees', () => {
  const input = fixture();
  // Last recorded sum remains +120, but modeled [+90,+30] and authored
  // observed [-10,+130] disagree at both paired bearings.
  input.observedInput.samples[2].verticalBearingReactionLb = [-10, 130];
  assert.throws(() => compare(input), /reaction|bearing|difference|tolerance/i);
  const totalMismatch = fixture();
  // Each individual difference is below 1 lb; total is outside 1 lb.
  totalMismatch.observedInput.samples[2].verticalBearingReactionLb = [90.75, 30.75];
  assert.throws(() => compare(totalMismatch), /reaction|bearing|difference|tolerance/i);
});
