import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { inspectionPrivateBytesMatch as match } from '../dist/fabrication/src/inspection-private-byte-digest.js';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('hashes only the exact private byte view and snapshots it before yielding', async t => {
  const actualDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
  t.mock.method(globalThis.crypto.subtle, 'digest', async (algorithm, snapshot) => {
    await Promise.resolve(); // Provider sees the bytes only after caller mutation.
    return actualDigest(algorithm, snapshot);
  });
  const owner = Uint8Array.of(0xaa, 7, 23, 0, 64, 0xbb);
  const body = owner.subarray(1, 5);
  const expected = digest(Buffer.from([7, 23, 0, 64]));
  assert.equal(await match(digest(owner), body), false, 'must not hash sibling bytes');
  const pending = match(expected, body);
  owner.fill(0xff);
  assert.equal(await pending, true, 'must capture the original selected bytes synchronously');
  assert.equal(await match(expected, body), false, 'subsequent call sees changed bytes');
});

test('fails closed for unsupported, oversized, shared, or detached values', async () => {
  const plain = Uint8Array.of(65, 66);
  const expected = digest(plain);
  const shared = new Uint8Array(new SharedArrayBuffer(2));
  shared.set(plain);
  const detached = plain.slice();
  structuredClone(detached.buffer, { transfer: [detached.buffer] });
  const oversized = new Uint8Array(16 * 1024 * 1024 + 1);
  assert.equal(await match(digest(oversized), oversized), false, 'correct digest cannot admit oversize');
  for (const [name, value] of [
    ['ordinary array', [65, 66]],
    ['array-like shape', { 0:65, 1:66, length:2, byteLength:2 }],
    ['data view', new DataView(plain.buffer)],
    ['non-byte typed view', new Uint16Array(plain.buffer)],
    ['shared byte view', shared],
    ['detached byte view', detached],
  ]) {
    assert.equal(await match(expected, value), false, name);
  }
});

test('does not accept the bytes when the cryptographic digest rejects', async t => {
  const bytes = Uint8Array.of(1, 2, 3);
  t.mock.method(globalThis.crypto.subtle, 'digest', async () => { throw new Error('synthetic provider failure'); });
  assert.equal(await match(digest(bytes), bytes), false);
});
