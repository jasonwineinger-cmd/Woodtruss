import test from 'node:test';
import assert from 'node:assert/strict';
import { captureAuthoredElasticFrameCombinationReview } from '../dist/analysis/src/elastic-frame-authored-combination-receipt.js';
import { replayAuthoredElasticFrameCombinationReview } from '../dist/analysis/src/elastic-frame-authored-combination-replay.js';

function authored() {
  return {
    modelId: 'synthetic-cantilever', modelRevision: 'R4',
    frame: {
      nodes: [{ id: 'A', xIn: 0, yIn: 0 }, { id: 'B', xIn: 60, yIn: 0 }],
      members: [{ id: 'beam', startNodeId: 'A', endNodeId: 'B', areaIn2: 8,
        secondMomentIn4: 2 * 4 ** 3 / 12, elasticModulusPsi: 1300000 }],
      supports: [{ nodeId: 'A', fixX: true, fixY: true, fixRotation: true }],
    },
    sources: [
      { caseId: 'gravity', sourceRef: 'Synthetic G ref', loads: [], memberPointLoads: [
        { memberId: 'beam', stationIn: 17, fxLb: 10, fyLb: -42 },
      ] },
      { caseId: 'uplift', sourceRef: 'Synthetic U ref', loads: [{ nodeId: 'B', fxLb: 0, fyLb: 18, momentLbIn: 0 }] },
    ],
    combinations: [{ caseId: 'authored', sourceRef: 'Synthetic combination ref',
      terms: [{ caseId: 'gravity', factor: 1.1 }, { caseId: 'uplift', factor: -0.2 }] }],
    members: [{ memberId: 'beam', rectangle: { actualWidthIn: 2, actualDepthIn: 4 } }],
  };
}

function verifyFrozen(data) {
  if (data === null || typeof data !== 'object') return;
  assert.ok(Object.isFrozen(data));
  for (const child of Object.values(data)) verifyFrozen(child);
}

test('capture deeply detaches and freezes the entire normalized receipt without caching results', () => {
  const input = authored();
  const original = structuredClone(input);
  const receipt = captureAuthoredElasticFrameCombinationReview(input);
  assert.deepEqual(Object.keys(receipt).sort(), ['input', 'kind', 'manufacturingApproved', 'status']);
  assert.equal(receipt.kind, 'authored-elastic-frame-combination-review/v1');
  assert.equal(receipt.status, 'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(receipt.manufacturingApproved, false);
  verifyFrozen(receipt);
  assert.notEqual(receipt.input.sources[0].memberPointLoads, input.sources[0].memberPointLoads);
  input.sources[0].memberPointLoads[0].stationIn = 43;
  input.combinations[0].terms.reverse();
  assert.deepEqual(JSON.parse(JSON.stringify(receipt.input)), original);
  assert.throws(() => { receipt.input.frame.nodes[0].xIn = 12; }, TypeError);
});

test('capture rejects nonfinite and sparse input without invoking an authored getter', () => {
  const nonfinite = authored();
  nonfinite.sources[0].memberPointLoads[0].stationIn = NaN;
  assert.throws(() => captureAuthoredElasticFrameCombinationReview(nonfinite));
  const sparse = authored();
  delete sparse.sources[0];
  assert.throws(() => captureAuthoredElasticFrameCombinationReview(sparse));
  const getter = authored();
  let reads = 0;
  Object.defineProperty(getter.sources[0], 'sourceRef', {
    enumerable: true, get() { reads++; return 'forged'; },
  });
  assert.throws(() => captureAuthoredElasticFrameCombinationReview(getter));
  assert.equal(reads, 0, 'receipt snapshot must not execute accessors');
});

test('replays a serialized exact receipt but rejects changes in declared identity, station, geometry or ordering', () => {
  const exact = authored();
  const receipt = captureAuthoredElasticFrameCombinationReview(exact);
  const persisted = JSON.parse(JSON.stringify(receipt));
  const replayed = replayAuthoredElasticFrameCombinationReview(persisted, exact);
  assert.equal(replayed.manufacturingApproved, false);
  assert.equal(replayed.fabricationAuthorized, false);
  const governing = replayed.memberEnvelope.beam.positiveDepth.max;
  assert.equal(governing.caseId, 'authored');
  assert.equal(governing.stationIn, 0);
  assert.ok(Math.abs(governing.momentLbIn - (-1.1 * 42 * 17 - 0.2 * 18 * 60)) < 1e-8);

  const mutations = [
    input => { input.sources[0].sourceRef = 'Different declared reference'; },
    input => { input.combinations[0].sourceRef = 'Changed combination reference'; },
    input => { input.modelRevision = 'R5'; },
    input => { input.sources[0].memberPointLoads[0].stationIn = 43; },
    input => {
      Object.assign(input.frame.members[0], { startNodeId: 'B', endNodeId: 'A' });
      input.sources[0].memberPointLoads[0].stationIn = 43;
    },
    input => { input.frame.nodes[1].xIn = 61; },
    input => { input.sources.reverse(); },
    input => { input.combinations[0].terms.reverse(); },
  ];
  for (const mutate of mutations) {
    const different = authored();
    mutate(different);
    assert.throws(() => replayAuthoredElasticFrameCombinationReview(receipt, different));
    const alteredReceipt = JSON.parse(JSON.stringify(receipt));
    mutate(alteredReceipt.input);
    assert.throws(() => replayAuthoredElasticFrameCombinationReview(alteredReceipt, exact));
  }
});

test('replay rejects extra receipt keys, forged approvals and cached outputs', () => {
  const original = authored();
  const receipt = captureAuthoredElasticFrameCombinationReview(original);
  for (const change of [
    { status: 'APPROVED' },
    { manufacturingApproved: true },
    { fabricationAuthorized: false },
    { memberEnvelope: { beam: { forged: true } } },
    { caseResults: [] },
    { kind: 'authored-elastic-frame-combination-review/v0' },
  ]) {
    assert.throws(() => replayAuthoredElasticFrameCombinationReview({ ...receipt, ...change }, original));
  }
  let reads = 0;
  const suspect = { ...receipt };
  Object.defineProperty(suspect, 'input', {
    enumerable: true, get() { reads++; return original; },
  });
  assert.throws(() => replayAuthoredElasticFrameCombinationReview(suspect, original));
  assert.equal(reads, 0, 'untrusted receipt getter never runs');
});
