import test from 'node:test';
import assert from 'node:assert/strict';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const L = 12, a = 3, b = 2, h = 4;
const A = b * h, S = b * h ** 2 / 6;
const base = {
  nodes: [{ id: 'A', xIn: 0, yIn: 0 }, { id: 'B', xIn: L, yIn: 0 }],
  members: [{ id: 'AB', startNodeId: 'A', endNodeId: 'B', areaIn2: A,
    secondMomentIn4: b * h ** 3 / 12, elasticModulusPsi: 1200000 }],
  supports: [{ nodeId: 'A', fixX: true, fixY: true, fixRotation: true }],
  loads: [],
  memberRectangularStressExtrema: [{ memberId: 'AB', rectangle: { actualWidthIn: b, actualDepthIn: h } }],
};
const uniform = qyLbPerIn => [{ memberId: 'AB', basis: 'member-length', qxLbPerIn: 1, qyLbPerIn }];
const point = (fxLb, fyLb) => [{ memberId: 'AB', stationIn: a, fxLb, fyLb }];
const near = (actual, expected, name) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-8,
    `${name}: expected ${expected}, got ${actual}`);

test('rectangle normal-stress extrema occur at different cuts than bending alone', () => {
  const result = solveElasticFrame({
    ...base, loads: [{ nodeId: 'B', fxLb: 0, fyLb: 14, momentLbIn: 0 }],
    memberLoads: uniform(-2), memberPointLoads: point(4, -8),
  });
  // Right-half statics after the point give N=12-x, V=2x-10,
  // M=10x-x²+24. Before the point N=16-x and M=18x-x².
  // The before-point positive-depth stress decreases on [0,3] and
  // negative-depth stress increases there. On [3,12] the respective
  // quadratics have their global min/max at 16/3 and 14/3.
  const data = result.memberRectangularStressExtrema.AB;
  for (const [row, x, sigma, sign] of [
    [data.positiveDepth.min, 16 / 3, -25 / 3, -1],
    [data.negativeDepth.max, 14 / 3, 121 / 12, 1],
  ]) {
    near(row.stationIn, x, 'stress station');
    assert.equal(row.side, 'continuous');
    near(row.axialLb, 12 - x, 'same-cut axial');
    near(row.shearLb, 2 * x - 10, 'same-cut shear');
    near(row.momentLbIn, 10 * x - x ** 2 + 24, 'same-cut moment');
    near(row.normalStressPsi, sigma, 'normal stress');
    near(row.normalStressPsi, row.axialLb / A + sign * row.momentLbIn / S, 'coincident components');
  }
  near(data.positiveDepth.max.stationIn, 0, 'positive-depth maximum station');
  near(data.positiveDepth.max.normalStressPsi, 2, 'positive-depth maximum');
  near(data.negativeDepth.min.stationIn, L, 'negative-depth minimum station');
  near(data.negativeDepth.min.normalStressPsi, 0, 'negative-depth minimum');
  const peakMoment = result.memberSectionDemand.AB.extrema.momentLbIn.max;
  near(peakMoment.stationIn, 5, 'bending-only peak station');
  near(peakMoment.momentLbIn, 49, 'bending-only peak');
  assert.notEqual(data.positiveDepth.min.stationIn, peakMoment.stationIn);
  assert.notEqual(data.negativeDepth.max.stationIn, peakMoment.stationIn);
});

test('sharp axial jump can make the right-hand cut the winning fiber candidate', () => {
  const result = solveElasticFrame({
    ...base, memberLoads: uniform(0), memberPointLoads: point(-8, 0),
  }).memberRectangularStressExtrema.AB;
  // N=4-x just before the point and N=12-x just after; this produces
  // an 8 lb jump without bending, so both fibers peak at the right side.
  for (const side of [result.positiveDepth, result.negativeDepth]) {
    near(side.max.stationIn, a, 'jump station');
    assert.equal(side.max.side, 'right');
    near(side.max.axialLb, 9, 'post-jump axial');
    near(side.max.momentLbIn, 0, 'zero bending');
    near(side.max.normalStressPsi, 9 / A, 'stress at post-jump face');
  }
});

test('flat face intervals do not hide a governing point limit or generate a false interior peak',()=>{
  const model={
    nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:12,yIn:0}],
    members:[{id:'beam',startNodeId:'A',endNodeId:'B',areaIn2:8,secondMomentIn4:32/3,
      elasticModulusPsi:12_000,releaseStartRotation:true,releaseEndRotation:true}],
    supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:false},{nodeId:'B',fixX:false,fixY:true,fixRotation:false}],
    loads:[],
    memberLoads:[{memberId:'beam',basis:'member-length',qxLbPerIn:-6,qyLbPerIn:0}],
    memberPointLoads:[{memberId:'beam',stationIn:6,fxLb:4,fyLb:-8}],
    memberRectangularStressExtrema:[{memberId:'beam',rectangle:{actualWidthIn:2,actualDepthIn:4}}],
  };
  const {positiveDepth:upper,negativeDepth:lower}=solveElasticFrame(model).memberRectangularStressExtrema.beam;
  const check=(row,side,stress)=>{
    assert.equal(row.stationIn,6);
    assert.equal(row.side,side);
    assert.ok(Math.abs(row.normalStressPsi-stress)<1e-10);
    assert.ok(Math.abs(row.momentLbIn-24)<1e-10);
  };
  check(upper.min,'right',-9);
  check(lower.max,'left',0.5);
});

test('reversed axes swap the face labels and complement physical extreme locations',()=>{
  const model={...base,loads:[{nodeId:'B',fxLb:0,fyLb:14,momentLbIn:0}],
    memberLoads:uniform(-2),memberPointLoads:point(4,-8)};
  const forward=solveElasticFrame(model).memberRectangularStressExtrema.AB;
  const reversed=solveElasticFrame({
    ...model,members:[{...model.members[0],startNodeId:'B',endNodeId:'A'}],
    memberPointLoads:[{...model.memberPointLoads[0],stationIn:L-a}],
  }).memberRectangularStressExtrema.AB;
  for(const [a,b] of [[forward.positiveDepth,reversed.negativeDepth],[forward.negativeDepth,reversed.positiveDepth]]){
    for(const name of ['min','max']){
      near(b[name].normalStressPsi,a[name].normalStressPsi,'same physical face stress');
      near(b[name].stationIn,L-a[name].stationIn,'same physical station');
    }
  }
});
