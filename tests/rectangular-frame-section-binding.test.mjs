import test from 'node:test';
import assert from 'node:assert/strict';
import {bindRectangularFrameSection} from '../dist/lumber/src/rectangular-frame-section-binding.js';

const b=1.5,h=5.5,A=8.25,I=20.796875;
const input={actualWidthIn:b,actualDepthIn:h,memberAreaIn2:A,memberSecondMomentIn4:I};

test('binds actual rectangular gross area and centroidal bending inertia, not just matching area',()=>{
  const result=bindRectangularFrameSection(input);
  assert.equal(result.actualWidthIn,b);
  assert.equal(result.actualDepthIn,h);
  assert.equal(result.areaIn2,A);
  assert.ok(Math.abs(result.secondMomentIn4-I)<1e-13);
  assert.equal(result.manufacturingApproved,false);
  assert.throws(()=>bindRectangularFrameSection({...input,actualWidthIn:h,actualDepthIn:b}),/does not match/);
  assert.throws(()=>bindRectangularFrameSection({...input,memberAreaIn2:8}),/does not match/);
  assert.throws(()=>bindRectangularFrameSection({...input,memberSecondMomentIn4:20.8}),/does not match/);
});

test('allows arithmetic roundoff only, with no absolute floor for small valid sections',()=>{
  const tiny={actualWidthIn:1e-30,actualDepthIn:1e-30,memberAreaIn2:1e-60,memberSecondMomentIn4:1e-120/12};
  assert.doesNotThrow(()=>bindRectangularFrameSection(tiny));
  assert.doesNotThrow(()=>bindRectangularFrameSection({...input,memberSecondMomentIn4:I*(1+16*Number.EPSILON)}));
  assert.throws(()=>bindRectangularFrameSection({...input,memberSecondMomentIn4:I*(1+128*Number.EPSILON)}),/does not match/);
  assert.throws(()=>bindRectangularFrameSection({...tiny,memberSecondMomentIn4:tiny.memberSecondMomentIn4*1.01}),/does not match/);
});

test('rejects malformed, overflowed and underprecision sectional properties',()=>{
  for(const change of [{actualDepthIn:0},{actualWidthIn:'1.5'},{memberAreaIn2:Infinity},{memberSecondMomentIn4:Number.MIN_VALUE},{extra:1},
    {actualWidthIn:1e200,actualDepthIn:1e200},
    {actualWidthIn:1e-100,actualDepthIn:1e-100}])
    assert.throws(()=>bindRectangularFrameSection({...input,...change}));
});

test('keeps a representable moment when only the unscaled intermediate product overflows',()=>{
  const wide=1.5e308,shallow=1.1;
  const actual=bindRectangularFrameSection({actualWidthIn:wide,actualDepthIn:shallow,
    memberAreaIn2:wide*shallow,memberSecondMomentIn4:wide/12*shallow**3});
  assert.ok(Number.isFinite(actual.secondMomentIn4));
});
