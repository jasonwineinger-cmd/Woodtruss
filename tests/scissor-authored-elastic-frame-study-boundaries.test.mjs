import test from 'node:test';
import assert from 'node:assert/strict';
import { generateScissorTopology } from '../dist/geometry/src/scissor.js';
import { studyAuthoredScissorElasticFrameReactions } from '../dist/analysis/src/scissor-authored-elastic-frame-study.js';

function authored(roofPatch = {}) {
  const roof = { family: 'scissor', spanFt: 40, pitchRisePer12: 6, bottomPitchRisePer12: 3, ...roofPatch };
  const topology = generateScissorTopology(roof);
  return {
    modelId: 'unrelated-synthetic-scissor', modelRevision: 'R2',
    roof,
    memberAssignments: topology.members.map(row => ({
      memberId: row.id, startNodeId: row.start, endNodeId: row.end,
      areaIn2: 5, secondMomentIn4: 23, elasticModulusPsi: 1300000,
      releaseStartRotation: false, releaseEndRotation: false,
    })),
    supports: [
      { nodeId: 'L', fixX: true, fixY: true, fixRotation: false },
      { nodeId: 'E', fixX: false, fixY: true, fixRotation: false },
    ],
    sources: [{ caseId: 'synthetic', sourceRef: 'Hand-authored proof input',
      loads: [{ nodeId: 'Q1', fxLb: 0, fyLb: -100, momentLbIn: 0 }] }],
    combinations: [{ caseId: 'single', sourceRef: 'Hand-authored proof factor',
      terms: [{ caseId: 'synthetic', factor: 1 }] }],
    originNodeId: 'L',
  };
}

test('requires accepted scissor geometry and stays preliminary even at the 50-ft study edge', () => {
  const accepted = studyAuthoredScissorElasticFrameReactions(authored({ spanFt: 50 }));
  assert.equal(accepted.family, 'scissor');
  assert.equal(accepted.status, 'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(accepted.fabricationAuthorized, false);
  assert.equal(accepted.frame.nodes.find(node => node.id === 'E').xIn, 600);
  for (const patch of [
    { spanFt: 50.001 }, { family: 'attic' }, { overhangIn: 1 }, { heelHeightIn: 1 },
    { bottomPitchRisePer12: 0 }, { bottomPitchRisePer12: 6 },
  ]) {
    const input = authored();
    Object.assign(input.roof, patch);
    assert.throws(() => studyAuthoredScissorElasticFrameReactions(input));
  }
});

test('requires complete ordered stiffness, releases, and exact support assignments', () => {
  const mutations = [
    input => { input.memberAssignments.pop(); },
    input => { input.memberAssignments.push({ ...input.memberAssignments[0] }); },
    input => { input.memberAssignments[0].memberId = 'unknown-member'; },
    input => { input.memberAssignments[1] = { ...input.memberAssignments[0] }; },
    input => {
      const row = input.memberAssignments[0];
      [row.startNodeId, row.endNodeId] = [row.endNodeId, row.startNodeId];
    },
    input => { delete input.memberAssignments[0].secondMomentIn4; },
    input => { delete input.memberAssignments[0].releaseEndRotation; },
    input => { input.memberAssignments[0].releaseStartRotation = 1; },
    input => { input.memberAssignments[0].capacityPsi = 500; },
    input => { input.supports[1].nodeId = 'R'; },
    input => { input.supports[1].fixY = false; },
    input => { input.supports.pop(); },
    input => { input.supports[1] = { nodeId: 'E', freeDx: 0, freeDy: 0, fixRotation: false }; },
  ];
  for (const [i, change] of mutations.entries()) {
    const input = authored();
    change(input);
    assert.throws(() => studyAuthoredScissorElasticFrameReactions(input), undefined, `mutation ${i}`);
  }
});

test('rejects injected defaults, approval, direct loads and invalid unused sources', () => {
  for (const extra of [{ defaultAreaIn2: 5 }, { fabricationAuthorized: true }, { loads: [] }, { frame: {} }]) {
    assert.throws(() => studyAuthoredScissorElasticFrameReactions({ ...authored(), ...extra }));
  }
  for (const source of [
    { loads: [{ nodeId: 'foreign', fxLb: 1, fyLb: 0, momentLbIn: 0 }] },
    { loads: [], memberPointLoads: [{ memberId: 'foreign', stationIn: 7, fxLb: 1, fyLb: 0 }] },
    { loads: [], memberPointLoads: [{ memberId: 'top-L-Q1', stationIn: 300, fxLb: 1, fyLb: 0 }] },
  ]) {
    const input = authored();
    input.sources.push({ caseId: 'unused', sourceRef: 'Hand-authored scope test', ...source });
    assert.throws(() => studyAuthoredScissorElasticFrameReactions(input));
  }
});
