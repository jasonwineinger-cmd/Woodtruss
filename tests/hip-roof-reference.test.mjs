import assert from 'node:assert/strict';
import test from 'node:test';
import { generateEqualPitchHipRoofReference } from '../dist/geometry/src/hip-roof-reference.js';

const base={lengthFt:40,widthFt:24,pitchRisePer12:6};

test('equal-pitch planes give half-width ridge inset and length minus width',()=>{
  const result=generateEqualPitchHipRoofReference(base);
  assert.equal(result.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(result.footprintIn,{length:480,width:288});
  assert.equal(result.ridgeInsetIn,144);
  assert.equal(result.riseIn,72);
  assert.deepEqual(result.ridge,{
    start:{x:144,y:144,z:72},end:{x:336,y:144,z:72},lengthIn:192,
  });
  assert.equal(result.hipLines.length,4);
  for (const [i,{from,to}] of result.hipLines.entries()) {
    assert.deepEqual(from,result.eaveCorners[i]);
    assert.equal(Math.abs(from.x-to.x),144);
    assert.equal(Math.abs(from.y-to.y),144);
    assert.equal(to.z-from.z,72);
  }
  assert.deepEqual(generateEqualPitchHipRoofReference({...base,lengthFt:50}).ridge.end,{x:456,y:144,z:72});
});

test('fails closed on unmodeled or nondegenerate geometry limits',()=>{
  for(const invalid of [
    {lengthFt:50.001},{widthFt:51},{widthFt:7},{lengthFt:Infinity},
    {lengthFt:24},{lengthFt:23},{pitchRisePer12:0},{pitchRisePer12:18.01},
    {pitchRisePer12:Number.MIN_VALUE},{overhangIn:1},{heelHeightIn:1},
  ]) assert.throws(()=>generateEqualPitchHipRoofReference({...base,...invalid}));
});
