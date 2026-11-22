import test from 'node:test';
import assert from 'node:assert/strict';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const height = 80;
const arm = 60;
const X = 48;
const Y = -30;
const Q = 130;
const column = { areaIn2: 3, secondMomentIn4: 18, elasticModulusPsi: 1800000 };
const beam = { areaIn2: 4, secondMomentIn4: 25, elasticModulusPsi: 1200000 };

const model = {
  nodes: [
    { id: 'A', xIn: 0, yIn: 0 },
    { id: 'B', xIn: 0, yIn: height },
    { id: 'C', xIn: arm, yIn: height },
  ],
  members: [
    { id: 'AB', startNodeId: 'A', endNodeId: 'B', ...column },
    { id: 'BC', startNodeId: 'B', endNodeId: 'C', ...beam },
  ],
  supports: [{ nodeId: 'A', fixX: true, fixY: true, fixRotation: true }],
  loads: [{ nodeId: 'C', fxLb: X, fyLb: Y, momentLbIn: Q }],
};

const near = (actual, expected, name, tolerance = 1e-10) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${name}: expected ${expected}, received ${actual}`);

test('heterogeneous bent cantilever matches independent axial and flexural energy derivatives', () => {
  const out = solveElasticFrame(model);
  const EIv = column.elasticModulusPsi * column.secondMomentIn4;
  const EIh = beam.elasticModulusPsi * beam.secondMomentIn4;
  const EAv = column.elasticModulusPsi * column.areaIn2;
  const EAh = beam.elasticModulusPsi * beam.areaIn2;
  // Section moments from the free-body cut to the tip, with t measured
  // backwards from the remote end of each segment:
  // column M(t) = Q + Y*arm - X*t, horizontal M(t) = Q + Y*t.
  // Axial forces are constant Y in the column and X in the arm.
  // Differentiate ∫(M²/EI + N²/EA)/2 along each segment (Castigliano).
  const elbowMoment = Q + Y * arm;
  const columnMomentIntegral = elbowMoment * height - X * height ** 2 / 2;
  const expectedUx = X * arm / EAh -
    (elbowMoment * height ** 2 / 2 - X * height ** 3 / 3) / EIv;
  const expectedUy = Y * height / EAv + arm * columnMomentIntegral / EIv +
    (Q * arm ** 2 / 2 + Y * arm ** 3 / 3) / EIh;
  const expectedAngle = columnMomentIntegral / EIv + (Q * arm + Y * arm ** 2 / 2) / EIh;

  near(out.displacements.C.uxIn, expectedUx, 'tip x');
  near(out.displacements.C.uyIn, expectedUy, 'tip y');
  near(out.displacements.C.rotationRad, expectedAngle, 'tip rotation');
  near(out.reactions.A.fxLb, -X, 'base x', 1e-8);
  near(out.reactions.A.fyLb, -Y, 'base y', 1e-8);
  near(out.reactions.A.momentLbIn, X * height - Y * arm - Q, 'base couple', 1e-7);
  assert.equal(out.equilibrium.passes, true);
});

test('freeing the only support rotation makes the bent cantilever a rigid-body mechanism', () => {
  const supports = [{ ...model.supports[0], fixRotation: false }];
  assert.throws(() => solveElasticFrame({ ...model, supports }), /singular|unstable|mechanism/i);
});

test('a redundant restraint count cannot make a mechanism stable', () => {
  const supports = [{...model.supports[0],fixRotation:false},
    {nodeId:'B',fixX:false,fixY:true,fixRotation:false}];
  // Vertical restraint at the same x as the pin does not oppose rotation.
  assert.throws(()=>solveElasticFrame({...model,supports}),/unstable|ill-conditioned/i);
});

test('bounded frame mode never silently ignores shear, member releases or an overspan',()=>{
  const unsupported = structuredClone(model);
  unsupported.members[0].releaseLeftRotation=true;
  assert.throws(()=>solveElasticFrame(unsupported),/rigid frame member/i);
  assert.throws(()=>solveElasticFrame({...model,shearDeformation:true}),/unknown or missing/i);
  const over=structuredClone(model); over.nodes[2].xIn=600.01;
  assert.throws(()=>solveElasticFrame(over),/50-ft/i);
  const max=structuredClone(model); max.nodes[2].xIn=600;
  assert.equal(solveElasticFrame(max).fabricationAuthorized,false);
});
