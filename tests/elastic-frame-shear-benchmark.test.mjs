import test from 'node:test';
import assert from 'node:assert/strict';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const near = (actual, expected, label, tolerance = 1e-10) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);

test('inclined Timoshenko cantilever adds signed shear translation, not section rotation', () => {
  const dx = 60, dy = 80, L = 100, c = dx / L, s = dy / L;
  const fx = 80, fy = -50;
  const section = { areaIn2: 5, secondMomentIn4: 28, elasticModulusPsi: 1600000 };
  const shear = { shearModulusPsi: 100000, effectiveShearAreaIn2: 3 };
  const EA = section.elasticModulusPsi * section.areaIn2;
  const EI = section.elasticModulusPsi * section.secondMomentIn4;
  const GAs = shear.shearModulusPsi * shear.effectiveShearAreaIn2;
  const axial = c * fx + s * fy;
  const transverse = -s * fx + c * fy;
  const member = { id: 'AB', startNodeId: 'A', endNodeId: 'B', ...section };
  const common = {
    nodes: [{ id: 'A', xIn: 0, yIn: 0 }, { id: 'B', xIn: dx, yIn: dy }],
    supports: [{ nodeId: 'A', fixX: true, fixY: true, fixRotation: true }],
    loads: [{ nodeId: 'B', fxLb: fx, fyLb: fy, momentLbIn: 0 }],
  };
  const withShear = solveElasticFrame({ ...common, members: [{ ...member, shear }] });
  const bendOnly = solveElasticFrame({ ...common, members: [member] });

  // End loading gives N=constant, V=constant and M(x)=V*(L-x).
  // Integrating axial strain, flexural curvature and shear strain
  // separately gives u, section rotation theta, and tip translation v.
  const u = axial * L / EA;
  const theta = transverse * L ** 2 / (2 * EI);
  const vBending = transverse * L ** 3 / (3 * EI);
  const vShear = transverse * L / GAs;
  const v = vBending + vShear;
  near(withShear.displacements.B.uxIn, c * u - s * v, 'tip x');
  near(withShear.displacements.B.uyIn, s * u + c * v, 'tip y');
  near(withShear.displacements.B.rotationRad, theta, 'section rotation');
  near(withShear.displacements.B.uxIn - bendOnly.displacements.B.uxIn, -s * vShear, 'added global x');
  near(withShear.displacements.B.uyIn - bendOnly.displacements.B.uyIn, c * vShear, 'added global y');
  near(withShear.displacements.B.rotationRad - bendOnly.displacements.B.rotationRad, 0,
    'no additional section rotation');
  near(withShear.reactions.A.fxLb, -fx, 'global fixed x', 1e-8);
  near(withShear.reactions.A.fyLb, -fy, 'global fixed y', 1e-8);
  near(withShear.reactions.A.momentLbIn, dy * fx - dx * fy, 'global fixed couple', 1e-7);

  const { localDisplacements, localEndActions } = withShear.memberEndActions.AB;
  for (const [i, value] of [0, 0, 0, u, v, theta].entries()) {
    near(localDisplacements[i], value, `local movement ${i}`);
  }
  for (const [i, value] of [-axial, -transverse, -transverse * L, axial, transverse, 0].entries()) {
    near(localEndActions[i], value, `local nodal action ${i}`, 1e-7);
  }
  assert.equal(withShear.equilibrium.passes, true);
});

test('a uniform force on an Euler–Bernoulli member can transfer through a separate shear-flexible member',()=>{
  const a=40,b=60, q=-2.5, G=100000, As=3;
  const props={areaIn2:4,secondMomentIn4:22,elasticModulusPsi:1600000};
  const common={
    nodes:[{id:'A',xIn:0,yIn:0},{id:'J',xIn:a,yIn:0},{id:'B',xIn:a+b,yIn:0}],
    members:[{id:'AJ',startNodeId:'A',endNodeId:'J',...props},
      {id:'JB',startNodeId:'J',endNodeId:'B',...props}],
    supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:true}],
    loads:[],
    memberLoads:[{memberId:'JB',basis:'member-length',qxLbPerIn:0,qyLbPerIn:q}],
  };
  const noShear=solveElasticFrame(common);
  const result=solveElasticFrame({...common,
    members:[{...common.members[0],shear:{shearModulusPsi:G,effectiveShearAreaIn2:As}},common.members[1]],
  });
  const check=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`expected ${expected}; got ${actual}`);
  // Constant shear q*b through segment AJ adds uniform translation to the
  // entire distal segment; curvature and cross-section rotations don't change.
  const added=q*b*a/(G*As);
  for(const node of ['J','B']) {
    check(result.displacements[node].uyIn-noShear.displacements[node].uyIn,added);
    check(result.displacements[node].rotationRad,noShear.displacements[node].rotationRad);
  }
  check(result.reactions.A.fyLb,-q*b);
  check(result.reactions.A.momentLbIn,-q*b*(a+b/2));
  assert.equal(result.memberEndActions.AJ.shearDeformationModeled,true);
  assert.equal(result.memberEndActions.JB.shearDeformationModeled,false);
});
