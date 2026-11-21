import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

const model = {
  nodes: [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 90, y: 120 }, { id: 'C', x: 180, y: 0 }],
  bars: ['AB', 'BC', 'AC'].map(id => ({
    id, a: id[0], b: id[1], areaIn2: 2, elasticModulusPsi: 1e6,
  })),
  supports: [{ nodeId: 'A', fixX: true, fixY: true }, { nodeId: 'C', fixX: false, fixY: true }],
};

function near(actual, expected, what, tolerance = 1e-7) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${what}: expected ${expected}, got ${actual}`);
}

test('split crosswind and uplift add at the apex; loads on restrained axes alter only reactions', () => {
  const apex = { nodeId: 'B', fxLb: -400, fyLb: 900 };
  const restraintLoads = [{ nodeId: 'A', fxLb: 125, fyLb: -75 }, { nodeId: 'C', fyLb: 55 }];
  const merged = analyzePinJointedTruss({ ...model, loads: [apex, ...restraintLoads] });
  const split = analyzePinJointedTruss({ ...model, loads: [
    { nodeId: 'B', fyLb: 600 }, restraintLoads[1], { nodeId: 'B', fxLb: -160, fyLb: 300 },
    restraintLoads[0], { nodeId: 'B', fxLb: -240 },
  ] });
  const noRestraintLoads = analyzePinJointedTruss({ ...model, loads: [apex] });

  // About A without the direct support loads, 180*Cy + 90*900 + 120*400 = 0.
  // Therefore Cy=-2150/3, Ay=-550/3 and Ax=400. Loads applied directly
  // on held axes are opposed at those axes: subtract (+125,-75) from A
  // and +55 from C without changing any displacement or member response.
  for (const out of [merged, split]) {
    near(out.reactionLb.A.x, 275, 'A direct-load-adjusted horizontal reaction');
    near(out.reactionLb.A.y, -325/3, 'A direct-load-adjusted vertical reaction');
    near(out.reactionLb.C.y, -2315/3, 'C direct-load-adjusted vertical reaction');
    near(out.reactionLb.C.x, 0, 'frictionless roller');
  }
  near(noRestraintLoads.reactionLb.A.x, 400, 'pin horizontal reaction without direct loading');
  near(noRestraintLoads.reactionLb.A.y, -550/3, 'pin vertical reaction without direct loading');
  near(noRestraintLoads.reactionLb.C.y, -2150/3, 'roller vertical reaction without direct loading');

  // Joint statics with (3/5,4/5) slopes give two tensile inclined bars
  // and a compressive bottom tie. The fixed-A/free-Cx bottom bar determines
  // uC; the two inclined FL/EA extensions give the free apex displacement.
  const lengths = { AB: 150, BC: 150, AC: 180 };
  const forces = { AB: 1375/6, BC: 5375/6, AC: -1075/2 };
  const elongation = id => forces[id] * lengths[id] / 2e6;
  const xC = elongation('AC');
  // 0.6*uB+0.8*vB=dAB and 0.6*(uC-uB)+0.8*vB=dBC.
  const xB = (elongation('AB') - elongation('BC') + 0.6*xC)/1.2;
  const yB = (elongation('AB') - 0.6*xB)/0.8;
  for (const out of [merged, split, noRestraintLoads]) {
    for (const [id, value] of Object.entries(forces)) near(out.axialForceLb[id], value, `${id} force`);
    near(out.displacementIn.C.x, xC, 'roller displacement', 1e-10);
    near(out.displacementIn.B.x, xB, 'apex horizontal displacement', 1e-10);
    near(out.displacementIn.B.y, yB, 'apex vertical displacement', 1e-10);
  }
});
