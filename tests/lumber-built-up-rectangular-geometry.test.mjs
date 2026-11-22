import test from 'node:test';
import assert from 'node:assert/strict';
import {studyIdealBuiltUpRectangularGeometry as study} from '../dist/lumber/src/index.js';

const piece=(id,x,y,b=2,h=4)=>({id,widthIn:b,depthIn:h,centerXIn:x,centerYIn:y});
const near=(got,want)=>assert.ok(Math.abs(got-want)<1e-10,`${got} expected ${want}`);

test('separation changes only the shifted inertia for that centroidal axis',()=>{
  const r=study([piece('lower',0,-4),piece('upper',0,4)]);
  assert.equal(r.areaIn2,16);
  assert.equal(r.centroidYIn,0);
  near(r.separatelyCentroidal.aboutXIn4,64/3);
  near(r.commonCentroidHomogeneous.aboutXIn4,64/3+256);
  near(r.commonCentroidHomogeneous.aboutYIn4,16/3);
  near(r.commonCentroidHomogeneous.productXYIn4,0);
  assert.equal(r.compositeActionVerified,false);
  assert.equal(r.approvedForStructuralUse,false);
});

test('touching rectangles recover a solid rectangle ideal; offsets preserve product sign and translation',()=>{
  const touching=study([piece('left',-1,0),piece('right',1,0)]);
  near(touching.commonCentroidHomogeneous.aboutXIn4,256/12);
  near(touching.commonCentroidHomogeneous.aboutYIn4,256/12);
  const a=study([piece('left',-2,-4),piece('right',2,4)]);
  const shifted=study([piece('left',8,-1),piece('right',12,7)]);
  near(a.commonCentroidHomogeneous.productXYIn4,128);
  assert.deepEqual(a.commonCentroidHomogeneous,shifted.commonCentroidHomogeneous);
  near(study([piece('left',-2,4),piece('right',2,-4)]).commonCentroidHomogeneous.productXYIn4,-128);
});

test('rejects missing geometry, duplicate items, overlaps and non-representable coordinates',()=>{
  const a=piece('a',0,0);
  for(const invalid of [[],[a],[a,{...a}],[a,piece('b',1,0)],
    [a,piece('b',Infinity,6)],[a,piece('b',0,8,0,4)],[a,piece('b',1e300,0)]])
    assert.throws(()=>study(invalid));
});
