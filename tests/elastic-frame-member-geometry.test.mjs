import test from 'node:test';
import assert from 'node:assert/strict';
import {solveElasticFrame} from '../dist/analysis/src/elastic-frame-solve.js';

const base = {id:'fixed', xIn:125, yIn:-15};
const tip = {id:'tip', xIn:89, yIn:33};
const section = {areaIn2:3.4, secondMomentIn4:14.2, elasticModulusPsi:1_250_000};
const qxLbPerIn = 1.75;
const qyLbPerIn = -1.25;

const near = (actual,expected,label,tolerance=1e-10) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual-expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);

for (const basis of ['member-length','horizontal-projection']) {
  test(`inclined northwest cantilever under signed global ${basis} load is invariant to endpoint ordering`, () => {
    const model = {
      // Deliberately place the free node at the equilibrium audit origin.
      nodes:[tip,base],
      members:[{id:'incline',startNodeId:base.id,endNodeId:tip.id,...section}],
      supports:[{nodeId:base.id,fixX:true,fixY:true,fixRotation:true}],
      loads:[],
      memberLoads:[{memberId:'incline',basis,qxLbPerIn,qyLbPerIn}],
    };
    const first = solveElasticFrame(model);
    const reversed = solveElasticFrame({...model, members:[{...model.members[0],startNodeId:tip.id,endNodeId:base.id}]});

    // Exact 36-48-60 triangle. On this slope each inch of actual
    // member length has 0.6 inch of positive horizontal measure.
    const length = 60, tangent = [-0.6,0.8], normal = [-0.8,-0.6];
    const measurePerIn = basis === 'member-length' ? 1 : 0.6;
    const [wx,wy] = [qxLbPerIn*measurePerIn,qyLbPerIn*measurePerIn];
    const axialDensity = tangent[0]*wx+tangent[1]*wy;
    const transverseDensity = normal[0]*wx+normal[1]*wy;
    // Axial force N(s)=q_axial*(L-s), and positive CCW
    // bending moment M(s)=q_transverse*(L-s)^2/2.
    const axialTip = axialDensity*length**2/(2*section.elasticModulusPsi*section.areaIn2);
    const flexuralTip = transverseDensity*length**4/(8*section.elasticModulusPsi*section.secondMomentIn4);
    const rotationTip = transverseDensity*length**3/(6*section.elasticModulusPsi*section.secondMomentIn4);
    const forceX = wx*length, forceY = wy*length;
    // Force centroid at (-18,+24) inches from the support.
    const loadMoment = -18*forceY-24*forceX;

    for (const out of [first,reversed]) {
      near(out.displacements.tip.uxIn,tangent[0]*axialTip+normal[0]*flexuralTip,'tip X');
      near(out.displacements.tip.uyIn,tangent[1]*axialTip+normal[1]*flexuralTip,'tip Y');
      near(out.displacements.tip.rotationRad,rotationTip,'tip rotation');
      near(out.reactions.fixed.fxLb,-forceX,'fixed X reaction',1e-8);
      near(out.reactions.fixed.fyLb,-forceY,'fixed Y reaction',1e-8);
      near(out.reactions.fixed.momentLbIn,-loadMoment,'fixed reaction couple',1e-7);
      assert.equal(out.equilibrium.passes,true);
      assert.equal(out.fabricationAuthorized,false);
    }
  });
}
