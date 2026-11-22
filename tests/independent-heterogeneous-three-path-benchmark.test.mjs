import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

const model = {
  nodes: [
    { id: 'A', x: -80, y: 0 }, { id: 'B', x: 0, y: -75 },
    { id: 'C', x: -90, y: -120 }, { id: 'J', x: 0, y: 0 },
  ],
  bars: [
    { id: 'AJ', a: 'A', b: 'J', areaIn2: 2, elasticModulusPsi: 1e6 },
    { id: 'BJ', a: 'B', b: 'J', areaIn2: 3, elasticModulusPsi: 1e6 },
    { id: 'CJ', a: 'C', b: 'J', areaIn2: 1, elasticModulusPsi: 1.5e6 },
  ],
  loads: [{ nodeId: 'J', fxLb: 271.2, fyLb: -638.4 }],
  supports: ['A', 'B', 'C'].map(nodeId => ({ nodeId, fixX: true, fixY: true })),
};

function close(actual, expected, label, tolerance = 1e-8) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual-expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);
}

test('three heterogeneous paths satisfy independent hand compatibility under biaxial load', () => {
  const r = analyzePinJointedTruss(model);
  // Axial slopes at J: (1,0), (0,1), (3/5,4/5), with stiffnesses
  // 25k, 40k, and 10k lb/in. Independent projected compatibility and
  // equilibrium give 28600*u + 4800*v = 271.2,
  // 4800*u + 46400*v = -638.4. Their solution is (0.012,-0.015).
  close(r.displacementIn.J.x, 0.012, 'J horizontal displacement', 1e-12);
  close(r.displacementIn.J.y, -0.015, 'J vertical displacement', 1e-12);
  // Projection of that displacement onto the diagonal is -0.0048 in.
  for (const [id, force] of Object.entries({ AJ: 300, BJ: -600, CJ: -48 }))
    close(r.axialForceLb[id], force, `${id} axial force`);
  for (const [id, x, y] of [['A', -300, 0], ['B', 0, 600], ['C', 28.8, 38.4]]) {
    close(r.reactionLb[id].x, x, `${id} reaction x`);
    close(r.reactionLb[id].y, y, `${id} reaction y`);
  }
  close(r.residualForceLb, 0, 'equilibrium residual');
});

test('removing the horizontal path changes diagonal compression into tension without making the joint unstable', () => {
  const out = analyzePinJointedTruss({ ...model, bars: model.bars.filter(bar=>bar.id!=='AJ') });
  // With AJ absent, equilibrium gives (3/5)*CJ=271.2 and
  // BJ+(4/5)*CJ=-638.4. N=(452,-1000) lb for CJ and BJ.
  close(out.axialForceLb.CJ, 452, 'diagonal force reverses');
  close(out.axialForceLb.BJ, -1000, 'vertical force increases');
  close(out.reactionLb.A.x, 0, 'disconnected held node has no reaction');
  close(out.reactionLb.C.x, -271.2, 'diagonal balances entire horizontal force');
  // v=-1000/40000, (3/5)*u+(4/5)*v=452/10000.
  close(out.displacementIn.J.y, -0.025, 'released vertical displacement', 1e-12);
  close(out.displacementIn.J.x, 163/1500, 'released horizontal displacement', 1e-12);
});
