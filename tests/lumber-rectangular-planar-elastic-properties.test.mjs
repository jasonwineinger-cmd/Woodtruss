import test from 'node:test';
import assert from 'node:assert/strict';
import { studyRectangularPlanarElasticProperties as study } from '../dist/lumber/src/index.js';

const rectangle = (transverseDirection = 'along-depth', effectiveShearAreaIn2 = 8) => ({
  sectionId: 'synthetic-r2x6', dimensionBasisId: 'demo-dims', actualWidthIn: 2, actualDepthIn: 6,
  transverseDirection,
  modulusHypothesis: { basisId: 'demo-elastic', longitudinalModulusPsi: 1000, shearModulusPsi: 100 },
  shearAreaHypothesis: { basisId: 'demo-area', transverseDirection, effectiveShearAreaIn2 },
});

test('uses perpendicular bending axis and separates gross axial area from authored shear area', () => {
  const alongDepth = study(rectangle());
  assert.equal(alongDepth.bendingAbout, 'width');
  assert.equal(alongDepth.inertiaIn4, 36); // 2*6^3/12
  assert.equal(alongDepth.axialRigidityLb, 12000);
  assert.equal(alongDepth.flexuralRigidityLbIn2, 36000);
  assert.equal(alongDepth.effectiveShearRigidityLb, 800);
  assert.equal(alongDepth.grossAreaShearReferenceLb, 1200);
  assert.equal(alongDepth.effectiveToGrossAreaRatio, 2 / 3);
  const alongWidth = study(rectangle('along-width', 9));
  assert.equal(alongWidth.bendingAbout, 'depth');
  assert.equal(alongWidth.inertiaIn4, 4); // 6*2^3/12
  assert.equal(alongWidth.flexuralRigidityLbIn2, 4000);
  assert.equal(alongWidth.effectiveShearRigidityLb, 900);
  assert.equal(alongWidth.axialRigidityLb, alongDepth.axialRigidityLb);
  assert.equal(alongWidth.approvedForStructuralUse, false);
  assert.equal(alongWidth.suppliedInputsIndependentlyVerified, false);
  assert.deepEqual([alongWidth.dimensionBasisId, alongWidth.modulusBasisId, alongWidth.shearAreaBasisId],
    ['demo-dims', 'demo-elastic', 'demo-area']);
});

test('rejects axis swaps, unknown or omitted author hypotheses, and nonfinite or out-of-study values', () => {
  const swapped = rectangle();
  swapped.shearAreaHypothesis.transverseDirection = 'along-width';
  assert.throws(() => study(swapped), /exact transverse direction/);
  assert.throws(() => study(rectangle('global-y')), /local transverse/);
  assert.throws(() => study({ ...rectangle(), modulusHypothesis: undefined }), /Explicit modulus/);
  assert.throws(() => study({ ...rectangle(), shearAreaHypothesis: undefined }), /shear-area hypothesis/);
  assert.throws(() => study(rectangle('along-depth', 13)), /at or below gross/);
  assert.throws(() => study(rectangle('along-depth', 0)), /positive shear-area/);
  assert.throws(() => study({ ...rectangle(), actualDepthIn: Infinity }), /Explicit rectangle/);
  assert.throws(() => study({ ...rectangle(), actualDepthIn: Number.MAX_VALUE }), /numeric range/);
});

test('gross-area shear is only accepted when explicitly authored', () => {
  const explicit = study(rectangle('along-depth', 12));
  assert.equal(explicit.effectiveToGrossAreaRatio, 1);
  assert.equal(explicit.effectiveShearRigidityLb, explicit.grossAreaShearReferenceLb);
});
