import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { reviewLumberEditionPrivateBytes } from '../dist/lumber/src/edition-private-artifact-bytes.js';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const create = () => {
  const slab = new Uint8Array([0, 11, 12, 0, 0, 21, 22, 0]);
  const bytes = [
    {artifactId:'source-a',bytes:slab.subarray(1,3)},
    {artifactId:'source-b',bytes:slab.subarray(5,7)},
  ];
  const expected = bytes.map(({artifactId,bytes}) => ({id:artifactId,sha256:sha(bytes)}));
  return {expected,bytes};
};

test('all exact byte views are snapshotted before the first digest invocation', async () => {
  const {expected,bytes}=create();
  const subtle=globalThis.crypto.subtle;
  const original=Object.getOwnPropertyDescriptor(subtle,'digest');
  const realDigest=subtle.digest.bind(subtle);
  let calls=0;
  Object.defineProperty(subtle,'digest',{
    configurable:true,
    value:(algorithm, data)=>{
      if (calls++===0) {
        bytes[1].bytes[0]=75;
        bytes[1].artifactId='later-caller-change';
        expected[1].sha256='a'.repeat(64);
      }
      return realDigest(algorithm,data);
    },
  });
  try {
    assert.deepEqual(await reviewLumberEditionPrivateBytes(expected,bytes),{matches:true,outstanding:[]});
    assert.equal(calls,2);
  } finally {
    if (original) Object.defineProperty(subtle,'digest',original);
    else delete subtle.digest;
  }
});

test('holds shared, detached, and duplicate views and does not invoke byte getters', async () => {
  for (const amend of [
    rows=>{rows[1].bytes=new Uint8Array(new SharedArrayBuffer(2));},
    rows=>{const detached=new Uint8Array(2); structuredClone(detached.buffer,{transfer:[detached.buffer]}); rows[1].bytes=detached;},
    rows=>{rows[1]=rows[0];},
    rows=>{rows[0].bytes=rows[0].bytes.buffer;},
  ]) {
    const {expected,bytes}=create();
    amend(bytes);
    const report=await reviewLumberEditionPrivateBytes(expected,bytes);
    assert.equal(report.matches,false);
    assert.ok(report.outstanding.length>0);
    assert.doesNotMatch(JSON.stringify(report),/source-[ab]/);
  }
  const {expected,bytes}=create();
  let called=0;
  Object.defineProperty(bytes[1],'bytes',{enumerable:true,get(){called++;return new Uint8Array([21,22]);}});
  assert.equal((await reviewLumberEditionPrivateBytes(expected,bytes)).matches,false);
  assert.equal(called,0);
});
