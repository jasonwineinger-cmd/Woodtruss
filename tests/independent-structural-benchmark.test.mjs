import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

const close = (actual, expected, tolerance, name) => {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${name}: expected ${expected} within ${tolerance}, got ${actual}`);
};

test('asymmetric pin-roller triangle matches hand statics and axial compatibility under oblique load', () => {
  const model = {
    nodes: [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 50, y: 120 }, { id: 'C', x: 140, y: 0 }],
    bars: [
      { id: 'AB', a: 'A', b: 'B', areaIn2: 2, elasticModulusPsi: 1e6 },
      { id: 'BC', a: 'B', b: 'C', areaIn2: 3, elasticModulusPsi: 1e6 },
      { id: 'AC', a: 'A', b: 'C', areaIn2: 4, elasticModulusPsi: 1e6 },
    ],
    loads: [{ nodeId: 'B', fxLb: 210, fyLb: -980 }],
    supports: [{ nodeId: 'A', fixX: true, fixY: true }, { nodeId: 'C', fixX: false, fixY: true }],
  };
  const result = analyzePinJointedTruss(model);
  // Moments about A give 140*Cy = 50*980 + 120*210. Sum of forces
  // then gives Ax = -210 and Ay = 450. The C roller has no x reaction.
  const expectedReactions = { A: { x: -210, y: 450 }, C: { x: 0, y: 530 } };
  for (const [id, expected] of Object.entries(expectedReactions)) {
    for (const axis of ['x', 'y']) {
      close(result.reactionLb[id][axis], expected[axis], 1e-7, `${id} reaction ${axis}`);
    }
  }

  // At A: (12/13)N_AB + 450 = 0, then N_AC = 210 - (5/13)N_AB.
  // At C: (4/5)N_BC + 530 = 0. Tension is positive.
  for (const [id, force] of Object.entries({ AB: -487.5, BC: -662.5, AC: 397.5 })) {
    close(result.axialForceLb[id], force, 1e-7, `${id} axial force`);
  }

  // Hooke: delta_AB=-0.0316875, delta_BC=-0.033125, delta_AC=0.0139125 in.
  // With A fixed and Cy held, uC=delta_AC. For B the projections are
  // 5*uB+12*vB=13*delta_AB and 3*(uC-uB)+4*vB=5*delta_BC.
  const expectedDisplacements = {
    A: { x: 0, y: 0 },
    B: { x: 4203 / 280000, y: -18181 / 448000 },
    C: { x: 1113 / 80000, y: 0 },
  };
  for (const [id, expected] of Object.entries(expectedDisplacements)) {
    for (const axis of ['x', 'y']) {
      close(result.displacementIn[id][axis], expected[axis], 1e-10, `${id} displacement ${axis}`);
    }
  }
  close(result.residualForceLb, 0, 1e-7, 'force residual');
});
