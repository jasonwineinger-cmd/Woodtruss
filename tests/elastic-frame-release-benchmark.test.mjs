import test from 'node:test';
import assert from 'node:assert/strict';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const near = (actual, expected, label, tolerance = 1e-9) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`);

test('assembled propped beam gives analytical uniform-load reactions and the interior section movement', () => {
  const L = 144, x = 61, w = 2.5;
  const section = { areaIn2: 5, secondMomentIn4: 31, elasticModulusPsi: 1200000 };
  const EI = section.elasticModulusPsi * section.secondMomentIn4;
  const result = solveElasticFrame({
    nodes: [
      { id: 'A', xIn: 0, yIn: 0 }, { id: 'C', xIn: x, yIn: 0 }, { id: 'B', xIn: L, yIn: 0 },
    ],
    members: [
      { id: 'AC', startNodeId: 'A', endNodeId: 'C', ...section },
      { id: 'CB', startNodeId: 'C', endNodeId: 'B', ...section,
        releaseStartRotation: false, releaseEndRotation: true },
    ],
    // The support at B fixes only y; the released member cannot supply an
    // equation for its disconnected global joint rotation.
    supports: [
      { nodeId: 'A', fixX: true, fixY: true, fixRotation: true },
      { nodeId: 'B', fixX: false, fixY: true, fixRotation: false },
    ],
    loads: [],
    memberLoads: ['AC', 'CB'].map(memberId => ({
      memberId, basis: 'member-length', qxLbPerIn: 0, qyLbPerIn: -w,
    })),
  });

  // Remove the prop: the cantilever's tip drops w*L^4/(8EI). An upward
  // reaction R at its tip lifts it R*L^3/(3EI). Enforcing zero tip
  // translation gives R_B=3wL/8; equilibrium then gives R_A and the base couple.
  const RB = 3 * w * L / 8;
  const RA = w * L - RB;
  const MA = w * L ** 2 / 2 - RB * L;
  // EI*y'' = -MA + RA*x - w*x^2/2 with y(0)=y'(0)=0.
  const displacement = (-MA * x ** 2 / 2 + RA * x ** 3 / 6 - w * x ** 4 / 24) / EI;
  const slope = (-MA * x + RA * x ** 2 / 2 - w * x ** 3 / 6) / EI;

  near(result.reactions.A.fyLb, RA, 'fixed vertical', 1e-7);
  near(result.reactions.A.momentLbIn, MA, 'fixed moment', 1e-7);
  near(result.reactions.B.fyLb, RB, 'prop vertical', 1e-7);
  near(result.reactions.B.momentLbIn, 0, 'prop moment', 1e-7);
  near(result.displacements.C.uyIn, displacement, 'interior y');
  near(result.displacements.C.rotationRad, slope, 'interior rotation');
  assert.equal(result.displacements.B.uyIn, 0);
  assert.equal(result.displacements.B.rotationRad, null);
  assert.equal(result.equilibrium.passes, true);
});

test('double-ended releases carry point and uniform reactions without assigning joint rotations',()=>{
  const length=100, station=30, intensity=-2, load=-120;
  const model={
    nodes:[{id:'A',xIn:10,yIn:12},{id:'B',xIn:110,yIn:12}],
    members:[{id:'AB',startNodeId:'A',endNodeId:'B',elasticModulusPsi:1000000,areaIn2:4,
      secondMomentIn4:25,releaseStartRotation:true,releaseEndRotation:true}],
    supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:false},{nodeId:'B',fixX:false,fixY:true,fixRotation:false}],
    loads:[],
    memberLoads:[{memberId:'AB',basis:'member-length',qxLbPerIn:0,qyLbPerIn:intensity}],
    memberPointLoads:[{memberId:'AB',stationIn:station,fxLb:0,fyLb:load}],
  };
  const {displacements,reactions,equilibrium}=solveElasticFrame(model);
  const right=-(intensity*length**2/2+load*station)/length;
  assert.equal(displacements.A.rotationRad,null);
  assert.equal(displacements.B.rotationRad,null);
  assert.ok(Math.abs(reactions.B.fyLb-right)<1e-9);
  assert.ok(Math.abs(reactions.A.fyLb-(-load-intensity*length-right))<1e-9);
  assert.equal(reactions.A.momentLbIn,0);
  assert.equal(reactions.B.momentLbIn,0);
  assert.equal(equilibrium.passes,true);
  assert.throws(()=>solveElasticFrame({...model,
    loads:[{nodeId:'B',fxLb:0,fyLb:0,momentLbIn:1e-12}],
  }),/nodal moment has no connected member rotation/i);
});
