import test from 'node:test';
import assert from 'node:assert/strict';
import {localizeElasticFrameSectionForce} from '../dist/analysis/src/elastic-frame-section-load-basis.js';

const point=(xIn,yIn)=>({xIn,yIn});
const left=point(14,-6),right=point(-46,74);
const fixture={left,right,fxLb:35,fyLb:-50};
const near=(a,b,epsilon=1e-12)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=epsilon,`${a} vs ${b}`);

test('directed inclined local axes resolve a signed force and reverse without changing measure',()=>{
  for(const dir of [1,-1]){
    const ends=dir===1?{left,right}:{left:right,right:left};
    const result=localizeElasticFrameSectionForce({...fixture,...ends});
    near(result.axialLb,-61*dir);
    near(result.transverseLb,2*dir);
    assert.equal(result.lengthIn,100);
    assert.equal(result.horizontalProjectionIn,60);
    near(Math.hypot(result.axialLb,result.transverseLb),Math.hypot(fixture.fxLb,fixture.fyLb));
  }
});

test('vertical has exact zero horizontal projection and near-axis inputs are not snapped',()=>{
  const vertical=localizeElasticFrameSectionForce({...fixture,left:point(2,0),right:point(2,-9)});
  assert.deepEqual(vertical,{axialLb:50,transverseLb:35,lengthIn:9,horizontalProjectionIn:0});
  const nearAxis=localizeElasticFrameSectionForce({left:point(0,0),right:point(10,1e-12),fxLb:1,fyLb:0});
  assert.ok(nearAxis.transverseLb<0);
  near(nearAxis.transverseLb,-1e-13,1e-26);
  const tiny=localizeElasticFrameSectionForce({left:point(0,0),right:point(Number.MIN_VALUE,Number.MIN_VALUE),fxLb:1,fyLb:1});
  near(tiny.axialLb,Math.SQRT2);
  assert.equal(tiny.transverseLb,0);
});

test('rejects invalid, degenerate or unrepresentable geometry and projected forces',()=>{
  for(const invalid of [
    {right:left},{right:point(Infinity,1)},{fzLb:1},{fxLb:NaN},
    {left:point(-1e308,0),right:point(1e308,0)},
    {left:point(0,0),right:point(1.5e308,1.5e308)},
    {left:point(0,0),right:point(Number.MIN_VALUE,1e308)},
    {left:point(0,0),right:point(1,1),fxLb:Number.MAX_VALUE,fyLb:Number.MAX_VALUE},
    {left:point(0,0),right:point(1,2),fxLb:Number.MIN_VALUE,fyLb:0},
  ]) assert.throws(()=>localizeElasticFrameSectionForce({...fixture,...invalid}));
});
