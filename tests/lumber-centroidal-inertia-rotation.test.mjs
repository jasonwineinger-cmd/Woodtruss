import test from 'node:test';
import assert from 'node:assert/strict';
import { rotateAuthoredCentroidalInertia as rotate } from '../dist/lumber/src/index.js';

const input = (axesRotationDegrees, tensor = { ixIn4: 6, iyIn4: 10, ixyIn4: -2 }) =>
  ({ sectionId: 'synthetic-section', tensorBasisId: 'authored-centroid', tensor, axesRotationDegrees });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} ≠ ${expected}`);
const det = ({ ixIn4, iyIn4, ixyIn4 }) => ixIn4 * iyIn4 - ixyIn4 ** 2;

test('rotates a signed nonprincipal tensor and preserves trace, determinant, and inverse', () => {
  const result = rotate(input(45));
  const { ixIn4, iyIn4, ixyIn4 } = result.rotatedTensor;
  close(ixIn4, 10); close(iyIn4, 6); close(ixyIn4, -2);
  close(ixIn4 + iyIn4, 16); close(det(result.rotatedTensor), 56);
  const back = rotate(input(-45, result.rotatedTensor)).rotatedTensor;
  close(back.ixIn4, 6); close(back.iyIn4, 10); close(back.ixyIn4, -2);
  const opposite = rotate(input(-45)).rotatedTensor;
  close(opposite.ixIn4, 6); close(opposite.iyIn4, 10); close(opposite.ixyIn4, 2);
  assert.equal(result.sourceTensorIndependentlyVerified, false);
  assert.equal(result.approvedForStructuralUse, false);
});

test('cardinal turns exchange axes and preserve the product sign convention exactly', () => {
  assert.deepEqual(rotate(input(90)).rotatedTensor, { ixIn4: 10, iyIn4: 6, ixyIn4: 2 });
  assert.deepEqual(rotate(input(-180)).rotatedTensor, { ixIn4: 6, iyIn4: 10, ixyIn4: -2 });
  assert.deepEqual(rotate(input(0)).rotatedTensor, { ixIn4: 6, iyIn4: 10, ixyIn4: -2 });
});

test('rejects degenerate, impossible, unsupported, and untraceable inputs', () => {
  for (const tensor of [
    { ixIn4: 0, iyIn4: 3, ixyIn4: 0 },
    { ixIn4: 4, iyIn4: 9, ixyIn4: 6 },
    { ixIn4: 4, iyIn4: 9, ixyIn4: -7 },
    { ixIn4: 4, iyIn4: Infinity, ixyIn4: 0 },
  ]) assert.throws(() => rotate(input(0, tensor)), /positive-definite/);
  assert.throws(() => rotate(input(181)), /axis rotation/);
  assert.throws(() => rotate({ ...input(30), tensorBasisId: '' }), /tensor basis/);
  assert.throws(() => rotate(input(Number.MIN_VALUE)), /Angle cannot/);
  assert.throws(() => rotate(input(45, { ixIn4: Number.MAX_VALUE, iyIn4: Number.MIN_VALUE, ixyIn4: 0 })),
    /working numeric range/);
});
