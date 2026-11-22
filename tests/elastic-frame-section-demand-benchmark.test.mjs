import test from 'node:test';
import assert from 'node:assert/strict';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const near = (actual, expected, name, tolerance = 1e-7) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${name}: expected ${expected}, got ${actual}`);

test('released beam end actions do not bound interior moment under uniform and point loading', () => {
  const L = 144, w = 2, P = 40, a = 30;
  const result = solveElasticFrame({
    nodes: [{ id: 'A', xIn: 0, yIn: 0 }, { id: 'B', xIn: L, yIn: 0 }],
    members: [{ id: 'AB', startNodeId: 'A', endNodeId: 'B', areaIn2: 4,
      secondMomentIn4: 28, elasticModulusPsi: 1500000,
      releaseStartRotation: true, releaseEndRotation: true }],
    supports: [
      { nodeId: 'A', fixX: true, fixY: true, fixRotation: false },
      { nodeId: 'B', fixX: false, fixY: true, fixRotation: false },
    ],
    loads: [],
    memberLoads: [{ memberId: 'AB', basis: 'member-length', qxLbPerIn: 0, qyLbPerIn: -w }],
    memberPointLoads: [{ memberId: 'AB', stationIn: a, fxLb: 0, fyLb: -P }],
  });

  // Take whole-beam moments about B. At a section x, the loads to the
  // left then give cut force V=-RA+w*x+P and cut moment
  // M=RA*x-w*x²/2-P*(x-a) after the point; both act on left material.
  const RA = w * L / 2 + P * (L - a) / L;
  const RB = w * L + P - RA;
  const root = (RA - P) / w;
  assert.ok(root > a && root < L);
  const expectedPeak = RA * root - w * root ** 2 / 2 - P * (root - a);
  near(result.reactions.A.fyLb, RA, 'left bearing force');
  near(result.reactions.B.fyLb, RB, 'right bearing force');
  near(result.memberEndActions.AB.localEndActions[2], 0, 'left released moment');
  near(result.memberEndActions.AB.localEndActions[5], 0, 'right released moment');

  const demand = result.memberSectionDemand.AB;
  const section = (station, side) => {
    const state = demand.sections.find(row => Math.abs(row.stationIn - station) <= 1e-9 &&
      (side === undefined || row.side === side));
    assert.ok(state, `missing section at ${station}, side ${side ?? 'any'}`);
    return state;
  };
  const pre = section(a, 'left');
  const post = section(a, 'right');
  near(pre.shearLb, -RA + w * a, 'pre-point shear');
  near(post.shearLb, -RA + w * a + P, 'post-point shear');
  const momentAtPoint = RA * a - w * a ** 2 / 2;
  near(pre.momentLbIn, momentAtPoint, 'pre-point moment');
  near(post.momentLbIn, momentAtPoint, 'point force leaves moment continuous');
  const peak = section(root, 'continuous');
  near(peak.shearLb, 0, 'peak-moment section shear');
  near(peak.axialLb, 0, 'peak-moment section axial force');
  near(peak.momentLbIn, expectedPeak, 'internal peak moment');
  near(section(0).momentLbIn, 0, 'left endpoint section moment');
  near(section(L).momentLbIn, 0, 'right endpoint section moment');
  near(demand.extrema.momentLbIn.min.momentLbIn, 0, 'minimum sagging moment');
  near(demand.extrema.momentLbIn.max.momentLbIn, expectedPeak, 'maximum sagging moment');
  near(demand.extrema.momentLbIn.max.stationIn, root, 'maximum-moment station');
  near(demand.extrema.shearLb.min.shearLb, -RA, 'left cut minimum shear');
  near(demand.extrema.shearLb.max.shearLb, RB, 'right cut maximum shear');
});

test('inclined cantilever section cuts use the authored horizontal-projection basis and signed member axes',()=>{
  const result=solveElasticFrame({
    nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:60,yIn:80}],
    members:[{id:'AB',startNodeId:'A',endNodeId:'B',areaIn2:4,secondMomentIn4:22,elasticModulusPsi:1_600_000}],
    supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:true}],
    loads:[],
    memberLoads:[{memberId:'AB',basis:'horizontal-projection',qxLbPerIn:3,qyLbPerIn:-4}],
  });
  const [a,b]=result.memberSectionDemand.AB.sections;
  // Signed dot products over 60 projected inches give local totals -84 and -288.
  const check=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`got ${actual}, expected ${expected}`);
  assert.equal(a.stationIn,0);assert.equal(b.stationIn,100);
  check(a.axialLb,-84);check(a.shearLb,-288);check(a.momentLbIn,-14400);
  check(b.axialLb,0);check(b.shearLb,0);check(b.momentLbIn,0);
  assert.equal(result.memberSectionDemand.AB.manufacturingApproved,false);
});
