import test from 'node:test';
import assert from 'node:assert/strict';
import { generateScissorTopology } from '../dist/geometry/src/scissor.js';
import { compareAuthoredScissorElasticFrameReleases } from '../dist/analysis/src/scissor-authored-release-comparison.js';

function fixture() {
  const roof = { family: 'scissor', spanFt: 32, pitchRisePer12: 6, bottomPitchRisePer12: 3 };
  const members = generateScissorTopology(roof).members;
  return {
    modelId: 'synthetic-centered-scissor', modelRevision: 'R3',
    roof,
    memberAssignments: members.map(({ id, start, end }) => ({
      memberId: id, startNodeId: start, endNodeId: end,
      areaIn2: 6, secondMomentIn4: 17, elasticModulusPsi: 1250000,
      releaseStartRotation: false, releaseEndRotation: false,
    })),
    supports: [{ nodeId: 'L', fixX: true, fixY: true, fixRotation: false },
      { nodeId: 'E', fixX: false, fixY: true, fixRotation: false }],
    sources: [{ caseId: 'source', sourceRef: 'Synthetic only',
      loads: [{ nodeId: 'Q1', fxLb: 0, fyLb: -100, momentLbIn: 0 }] }],
    combinations: [{ caseId: 'case', sourceRef: 'Explicit synthetic factor', terms: [{ caseId: 'source', factor: 1 }] }],
    originNodeId: 'L',
    releaseVariants: [{ variantId: 'unchanged', sourceRef: 'Synthetic rigid flag', overrides: [] },
      { variantId: 'trial', sourceRef: 'Synthetic released flag', overrides: [
        { memberId: 'top-L-Q1', startNodeId: 'L', endNodeId: 'Q1',
          releaseStartRotation: true, releaseEndRotation: false },
      ] }],
    memberIds: ['top-L-Q1'],
  };
}
const compare = compareAuthoredScissorElasticFrameReleases;
function rejects(mutate) {
  const input = fixture();
  mutate(input);
  assert.throws(() => compare(input));
}

test('retains only the requested member study scope and never certifies a release variant', () => {
  const output = compare(fixture());
  assert.equal(output.family, 'scissor');
  assert.equal(output.status, 'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(output.fabricationAuthorized, false);
  assert.deepEqual(output.variants.map(row => row.variantId), ['unchanged', 'trial']);
  for (const variant of output.variants) {
    const [row] = variant.cases;
    assert.equal(row.caseId, 'case');
    assert.deepEqual(Object.keys(row.memberEndActions), ['top-L-Q1']);
    assert.deepEqual(Object.keys(row.memberDeflectionExtrema), ['top-L-Q1']);
  }
});

test('a couple applied at a joint whose incident ends are all released holds the entire study', () => {
  const input = fixture();
  const good = { ...input.sources[0], caseId: 'with-couple', loads: [
    ...input.sources[0].loads, { nodeId: 'R', fxLb: 0, fyLb: 0, momentLbIn: 55 },
  ] };
  input.sources.push(good);
  input.combinations.push({ caseId: 'joint-couple', sourceRef: 'An unsupported joint in one variant',
    terms: [{ caseId: 'with-couple', factor: 1 }] });
  const valid = compare(input);
  assert.equal(valid.variants[0].cases.length, 2);

  input.releaseVariants[1].overrides = input.memberAssignments
    .filter(row => row.startNodeId === 'R' || row.endNodeId === 'R')
    .map(({ memberId, startNodeId, endNodeId }) => ({
      memberId, startNodeId, endNodeId,
      releaseStartRotation: startNodeId === 'R', releaseEndRotation: endNodeId === 'R',
    }));
  assert.throws(() => compare(input), /rotation|unsupported|moment|case|variant/i);
});

test('rejects duplicate effective variants, unsupported override fields, and bounds violations', () => {
  const mutations = [
    input => { input.releaseVariants[1].overrides[0].releaseStartRotation = false; },
    input => { input.releaseVariants[1].variantId = input.releaseVariants[0].variantId; },
    input => { input.releaseVariants[1].overrides[0].startNodeId = 'Q1'; },
    input => { input.releaseVariants[1].overrides[0].areaIn2 = 8; },
    input => { input.releaseVariants[1].overrides[0].loads = []; },
    input => { input.releaseVariants[1].modelRevision = 'foreign'; },
    input => { input.modelRevision = ''; },
    input => { input.releaseVariants.pop(); },
    input => {
      const template = input.releaseVariants[1];
      input.releaseVariants = Array.from({ length: 7 }, (_, i) => ({ ...template, variantId: `variant-${i}` }));
    },
    input => { input.combinations = []; },
    input => {
      const template = input.combinations[0];
      input.combinations = Array.from({ length: 9 }, (_, i) => ({ ...template, caseId: `case-${i}` }));
    },
    input => { input.memberIds = []; },
    input => { input.memberIds = ['top-L-Q1', 'top-L-Q1']; },
    input => { input.memberIds = ['foreign']; },
    input => { input.memberIds = Array.from({ length: 14 }, (_, i) => `member-${i}`); },
    input => { delete input.releaseVariants[1]; },
    input => { input.releaseVariants[1].overrides[0].releaseStartRotation = NaN; },
  ];
  mutations.forEach(rejects);
});

test('fails closed on an accessor without running it', () => {
  const input = fixture();
  let reads = 0;
  Object.defineProperty(input.releaseVariants[1].overrides[0], 'releaseStartRotation', {
    enumerable: true, get() { reads++; return true; },
  });
  assert.throws(() => compare(input));
  assert.equal(reads, 0);
});
