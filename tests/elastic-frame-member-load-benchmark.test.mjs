import test from 'node:test';
import assert from 'node:assert/strict';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const section = { areaIn2: 3, secondMomentIn4: 27, elasticModulusPsi: 1500000 };
const EA = section.areaIn2 * section.elasticModulusPsi;
const EI = section.secondMomentIn4 * section.elasticModulusPsi;
const member = (id, startNodeId, endNodeId) => ({ id, startNodeId, endNodeId, ...section });
const node = (id, xIn, yIn) => ({ id, xIn, yIn });
const support = (nodeId, fixX, fixY, fixRotation) => ({ nodeId, fixX, fixY, fixRotation });
const uniform = (memberId, basis, qxLbPerIn, qyLbPerIn) => ({ memberId, basis, qxLbPerIn, qyLbPerIn });
const near = (actual, expected, label, tolerance = 1e-10) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);

test('two uniformly loaded simple-beam segments develop the analytic center deflection', () => {
  const L = 132;
  const q = -3.25;
  const result = solveElasticFrame({
    nodes: [node('A', 0, 0), node('B', L / 2, 0), node('C', L, 0)],
    members: [member('AB', 'A', 'B'), member('BC', 'B', 'C')],
    supports: [support('A', true, true, false), support('C', false, true, false)],
    loads: [],
    memberLoads: ['AB', 'BC'].map(id => uniform(id, 'member-length', 0, q)),
  });
  // Solve EI*v'' = |q|*x*(L-x)/2 with zero bearing deflections:
  // the center slope is zero and v(L/2) = 5*q*L^4/(384*EI).
  near(result.displacements.B.uyIn, 5 * q * L ** 4 / (384 * EI), 'center y');
  near(result.displacements.B.rotationRad, 0, 'center rotation');
  for (const id of ['A', 'C']) {
    near(result.reactions[id].fyLb, -q * L / 2, `${id} bearing y`, 1e-8);
    near(result.reactions[id].momentLbIn, 0, `${id} bearing moment`, 1e-7);
  }
  assert.equal(result.equilibrium.passes, true);
});

test('inclined cantilever agrees with axial and bending integrals in both load bases and windings', () => {
  const dx = 72, dy = 54, L = 90, c = dx / L, s = dy / L;
  const qx = 1.4, qy = -2.8;
  for (const [basis, ratio] of [['member-length', 1], ['horizontal-projection', dx / L]]) {
    const axial = ratio * (c * qx + s * qy);
    const transverse = ratio * (-s * qx + c * qy);
    // Integrate Hooke strain under N(x) = axial*(L-x), and integrate
    // curvature under M(x) = transverse*(L-x)^2/2 from the fixed end.
    const u = axial * L ** 2 / (2 * EA);
    const v = transverse * L ** 4 / (8 * EI);
    const rotation = transverse * L ** 3 / (6 * EI);
    for (const [start, end] of [['A', 'B'], ['B', 'A']]) {
      const result = solveElasticFrame({
        nodes: [node('A', 0, 0), node('B', dx, dy)],
        members: [member('slope', start, end)],
        supports: [support('A', true, true, true)],
        loads: [],
        memberLoads: [uniform('slope', basis, qx, qy)],
      });
      const label = `${basis}, ${start}→${end}`;
      near(result.displacements.B.uxIn, c * u - s * v, `${label}: tip x`);
      near(result.displacements.B.uyIn, s * u + c * v, `${label}: tip y`);
      near(result.displacements.B.rotationRad, rotation, `${label}: tip rotation`);
      near(result.reactions.A.fxLb, -ratio * L * qx, `${label}: fixed x`, 1e-8);
      near(result.reactions.A.fyLb, -ratio * L * qy, `${label}: fixed y`, 1e-8);
      near(result.reactions.A.momentLbIn, -ratio * L * (dx * qy - dy * qx) / 2,
        `${label}: fixed moment`, 1e-7);
      assert.equal(result.equilibrium.passes, true);
    }
  }
});

test('full uniform input fails closed on ambiguous, unsupported and nonfinite actions', () => {
  const model = {
    nodes: [node('A', 0, 0), node('B', 66, 0)],
    members: [member('AB', 'A', 'B')],
    supports: [support('A', true, true, true)], loads: [],
  };
  const supported = uniform('AB', 'member-length', 0, -3);
  for (const [memberLoads, reason] of [
    [undefined, /invalid frame member loads/i],
    [[], /invalid bounded frame data counts/i],
    [[{...supported, startFraction:0.25}], /invalid or repeated frame member load/i],
    [[{...supported, memberId:'other'}], /unknown loaded frame member/i],
    [[{...supported, basis:'roof-plan'}], /explicit supported line-load basis/i],
    [[{...supported, qyLbPerIn:Infinity}], /finite ordered endpoints/i],
  ]) assert.throws(()=>solveElasticFrame({...model, memberLoads}), reason);
  assert.throws(()=>solveElasticFrame({...model,
    nodes:[...model.nodes,node('C',132,0)],members:[...model.members,member('BC','B','C')],
    memberLoads:[supported,supported],
  }), /invalid or repeated frame member load/i);
});

test('explicit nodal action accumulates with uniform member action on the same nodes', () => {
  const L=84, P=-225, q=-3;
  const result=solveElasticFrame({
    nodes:[node('A',0,0),node('B',L,0)],
    members:[member('AB','A','B')], supports:[support('A',true,true,true)],
    loads:[{nodeId:'B',fxLb:0,fyLb:P,momentLbIn:0}],
    memberLoads:[uniform('AB','member-length',0,q)],
  });
  near(result.displacements.B.uyIn, P*L**3/(3*EI)+q*L**4/(8*EI), 'superposed tip y');
  near(result.reactions.A.fyLb,-P-q*L,'superposed support y',1e-8);
  near(result.reactions.A.momentLbIn,-P*L-q*L**2/2,'superposed support moment',1e-7);
  assert.equal(result.fabricationAuthorized,false);
});
