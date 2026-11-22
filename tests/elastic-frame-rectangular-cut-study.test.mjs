import test from 'node:test';
import assert from 'node:assert/strict';
import { studyElasticFrameRectangularCut } from '../dist/analysis/src/elastic-frame-rectangular-cut-study.js';

const b = 2, h = 5, L = 116, a = 41;
const qx = 1.6, qy = -2.05, fx = -46, fy = 82;
const A = b * h, S = b * h ** 2 / 6;
const frame = {
  nodes: [{ id: 'A', xIn: 0, yIn: 0 }, { id: 'B', xIn: L, yIn: 0 }],
  members: [{ id: 'beam', startNodeId: 'A', endNodeId: 'B', areaIn2: A,
    secondMomentIn4: b * h ** 3 / 12, elasticModulusPsi: 1400000 }],
  supports: [{ nodeId: 'A', fixX: true, fixY: true, fixRotation: true }],
  loads: [],
  memberLoads: [{ memberId: 'beam', basis: 'member-length', qxLbPerIn: qx, qyLbPerIn: qy }],
  memberPointLoads: [{ memberId: 'beam', stationIn: a, fxLb: fx, fyLb: fy }],
};
const selection = (stationIn, side) => ({
  memberId: 'beam', cut: { stationIn, side }, rectangle: { actualWidthIn: b, actualDepthIn: h },
});
const near = (actual, expected, label) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-8,
    `${label}: expected ${expected}, got ${actual}`);

test('signed rectangle fiber stresses use the co-occurring axial force and moment at each exact cut', () => {
  const results = [[17, 'continuous'], [a, 'left'], [a, 'right'], [89, 'continuous']].map(([x, side]) => {
    const out = studyElasticFrameRectangularCut({ frame, selection: selection(x, side) });
    const span = L - x;
    const hasPoint = x < a || (x === a && side === 'left');
    // Right-segment force and moment resultants supply the signed left
    // material cut values; all forces act on the centerline.
    const N = qx * span + (hasPoint ? fx : 0);
    const V = qy * span + (hasPoint ? fy : 0);
    const M = qy * span ** 2 / 2 + (hasPoint ? fy * (a - x) : 0);
    assert.equal(out.memberId, 'beam');
    assert.equal(out.startNodeId, 'A');
    assert.equal(out.endNodeId, 'B');
    assert.equal(out.cut.stationIn, x);
    assert.equal(out.cut.side, side);
    near(out.cut.axialLb, N, 'axial force');
    near(out.cut.shearLb, V, 'shear force');
    near(out.cut.momentLbIn, M, 'moment');
    assert.equal(out.status, 'PRELIMINARY_NOT_ENGINEERED');
    assert.equal(out.fabricationAuthorized, false);
    assert.equal(out.normalStress.approvedForStructuralUse, false);
    assert.equal(out.normalStress.peakAxialFiberStresses.length, 4);
    near(out.normalStress.input.momentAboutDepthLbIn, 0, 'no out-of-plane bending');
    for (const fiber of out.normalStress.peakAxialFiberStresses) {
      near(fiber.combinedNormalPsi, N / A - Math.sign(fiber.yIn) * M / S,
        `fiber at y=${fiber.yIn}`);
    }
    near(out.normalStress.maxTensionPsi, N / A + Math.abs(M) / S, 'peak tension');
    near(out.normalStress.maxCompressionMagnitudePsi, Math.abs(M) / S - N / A, 'peak compression');
    return out;
  });
  near(results[1].cut.momentLbIn, results[2].cut.momentLbIn, 'moment continuous at point');
  near(results[1].cut.axialLb - results[2].cut.axialLb, fx, 'signed axial force jump');
  // Peak N and |M| of these two sampled cuts do not coexist. Do not
  // synthesize one phantom peak stress by combining axial terms across cuts.
  const [before, , after] = results;
  assert.ok(after.cut.axialLb > before.cut.axialLb);
  assert.ok(Math.abs(before.cut.momentLbIn) > Math.abs(after.cut.momentLbIn));
  assert.ok(Math.max(before.normalStress.maxTensionPsi, after.normalStress.maxTensionPsi) <
    after.cut.axialLb / A + Math.abs(before.cut.momentLbIn) / S);
});

test('refuses a point without a side, swapped rectangle orientation, or injected raw results', () => {
  assert.throws(() => studyElasticFrameRectangularCut({ frame, selection: selection(a, 'continuous') }),
    /cut|side|continuous|station/i);
  assert.throws(() => studyElasticFrameRectangularCut({ frame, selection: {
    ...selection(17, 'continuous'), rectangle: { actualWidthIn: h, actualDepthIn: b },
  } }), /inertia|geometry|match|orientation|rectangle/i);
  assert.throws(() => studyElasticFrameRectangularCut({
    frame, selection: selection(17, 'continuous'), result: { axialLb: 50000 },
  }), /unknown|field|input/i);
  assert.throws(() => studyElasticFrameRectangularCut({
    frame, selection: { ...selection(17, 'continuous'), axialLb: 50000 },
  }), /unknown|field|selection/i);
});

test('reversal swaps local depth faces but preserves stress at the same physical face and point limit',()=>{
  const forward=studyElasticFrameRectangularCut({frame,selection:selection(a,'left')});
  const reversed=studyElasticFrameRectangularCut({
    frame:{...frame,members:[{...frame.members[0],startNodeId:'B',endNodeId:'A'}],
      memberPointLoads:[{...frame.memberPointLoads[0],stationIn:L-a}]},
    selection:selection(L-a,'right'),
  });
  assert.equal(reversed.startNodeId,'B');
  assert.equal(reversed.endNodeId,'A');
  near(reversed.cut.axialLb,forward.cut.axialLb,'same physical axial tension');
  near(reversed.cut.momentLbIn,-forward.cut.momentLbIn,'flipped local bending');
  for(const fiber of forward.normalStress.peakAxialFiberStresses){
    const opposite=reversed.normalStress.peakAxialFiberStresses.find(row=>row.xIn===fiber.xIn&&row.yIn===-fiber.yIn);
    assert.ok(opposite);
    near(opposite.combinedNormalPsi,fiber.combinedNormalPsi,'same signed stress on same physical fiber');
  }
});
