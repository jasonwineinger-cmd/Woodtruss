import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredElasticFrameCombinationReactions } from '../dist/analysis/src/elastic-frame-authored-combination-reactions.js';

function input() {
  const section = { areaIn2: 8, secondMomentIn4: 2 * 4 ** 3 / 12, elasticModulusPsi: 1300000 };
  return {
    modelId: 'synthetic-bent-cantilever', modelRevision: 'R7', originNodeId: 'C',
    frame: {
      nodes: [{ id: 'A', xIn: 0, yIn: 0 }, { id: 'B', xIn: 40, yIn: 0 }, { id: 'C', xIn: 40, yIn: 30 }],
      members: [
        { id: 'arm', startNodeId: 'A', endNodeId: 'B', ...section },
        { id: 'upright', startNodeId: 'B', endNodeId: 'C', ...section },
      ],
      supports: [{ nodeId: 'A', fixX: true, fixY: true, fixRotation: true }],
    },
    sources: [
      { caseId: 'point', sourceRef: 'Synthetic point', loads: [], memberPointLoads: [
        { memberId: 'arm', stationIn: 17, fxLb: 10, fyLb: -42 },
      ] },
      { caseId: 'vertical', sourceRef: 'Synthetic other case', loads: [{ nodeId: 'C', fxLb: 0, fyLb: 18, momentLbIn: 0 }] },
    ],
    combinations: [{ caseId: 'explicit', sourceRef: 'Synthetic weighting',
      terms: [{ caseId: 'point', factor: 1.1 }, { caseId: 'vertical', factor: -0.2 }] }],
  };
}

const near = (actual, expected, name) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-7, `${name}: ${actual} != ${expected}`);

test('balances the mixed weighted case around the authored offset origin without approving fabrication', () => {
  const output = studyAuthoredElasticFrameCombinationReactions(input());
  assert.equal(output.status, 'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(output.fabricationAuthorized, false);
  const [row] = output.cases;
  assert.equal(row.caseId, 'explicit');
  assert.equal(row.originNodeId, 'C');
  const expected = { fxLb: 11, fyLb: -49.8, momentLbIn: 1392.6 };
  // Weighted point at (17,0) is (-23,-30) from C, thus
  // moment = 1.1*(−23*−42 − (−30)*10); nodal action at C has zero arm.
  for (const [field, value] of Object.entries(expected)) {
    near(row.applied[field], value, `applied ${field}`);
    near(row.support[field], -value, `support ${field}`);
    near(row.residual[field], 0, `residual ${field}`);
  }
});

test('rejects malformed frame, wrong origin, and extra result or approval inputs', () => {
  const invalid = [
    value => { value.originNodeId = 'wrong-node'; },
    value => { value.originNodeId = { xIn: 0, yIn: 0 }; },
    value => { value.frame.members[0].endNodeId = 'wrong-node'; },
    value => { value.frame.nodes[1].xIn = Infinity; },
    value => { value.frame.loads = []; },
    value => { value.cases = []; },
    value => { value.cachedActions = { fxLb: 0 }; },
    value => { value.fabricationAuthorized = true; },
  ];
  for (const mutate of invalid) {
    const value = input();
    mutate(value);
    assert.throws(() => studyAuthoredElasticFrameCombinationReactions(value));
  }
});

test('fails closed on sparse or accessor data before executing authored getters', () => {
  const sparse = input();
  delete sparse.sources[0];
  assert.throws(() => studyAuthoredElasticFrameCombinationReactions(sparse));
  let reads = 0;
  for (const [object, key] of [
    ['outer', 'originNodeId'], ['nested', 'sourceRef'],
  ]) {
    const value = input();
    Object.defineProperty(object === 'outer' ? value : value.sources[0], key, {
      enumerable: true, get() { reads++; return 'C'; },
    });
    assert.throws(() => studyAuthoredElasticFrameCombinationReactions(value));
  }
  assert.equal(reads, 0);
});

test('even uncombined sources must match directed point extent and projected member geometry', () => {
  for (const action of [
    { memberPointLoads: [{ memberId: 'upright', stationIn: 30, fxLb: 1, fyLb: 0 }] },
    { memberPointLoads: [{ memberId: 'arm', stationIn: -1, fxLb: 1, fyLb: 0 }] },
    { memberLoads: [{ memberId: 'upright', basis: 'horizontal-projection', qxLbPerIn: 0, qyLbPerIn: -1 }] },
  ]) {
    const value = input();
    value.sources.push({ caseId: 'unused', sourceRef: 'Synthetic uncombined source', loads: [], ...action });
    assert.throws(() => studyAuthoredElasticFrameCombinationReactions(value));
  }
});
