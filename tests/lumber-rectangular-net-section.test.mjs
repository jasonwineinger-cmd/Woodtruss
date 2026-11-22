import test from 'node:test';
import assert from 'node:assert/strict';
import {studyRectangularNetSection as study} from '../dist/lumber/src/index.js';

const box=(id,leftIn,bottomIn,rightIn,topIn)=>({id,leftIn,bottomIn,rightIn,topIn});
const run=(voids)=>study({grossWidthIn:2,grossDepthIn:4,voids});
const near=(got,want)=>assert.ok(Math.abs(got-want)<1e-10,`${got} expected ${want}`);

test('subtracts an explicit corner void and shifts both centroidal moments and signed product',()=>{
  const r=run([box('notch',1,3,2,4)]);
  assert.deepEqual([r.grossAreaIn2,r.removedAreaIn2,r.netAreaIn2],[8,1,7]);
  near(r.centroidXIn,13/14);
  near(r.centroidYIn,25/14);
  near(r.netInertiaAboutXIn4,673/84);
  near(r.netInertiaAboutYIn4,193/84);
  near(r.netProductXYIn4,-6/7);
  assert.equal(r.physicalContinuityVerified,false);
  assert.equal(r.approvedForStructuralUse,false);
});

test('reflects product sign and allows exactly touching voids without double subtraction',()=>{
  const r=run([box('notch',0,3,1,4)]);
  near(r.centroidXIn,15/14);
  near(r.netProductXYIn4,6/7);
  const compound=run([box('first',1,3,2,3.5),box('second',1,3.5,2,4)]);
  const single=run([box('one',1,3,2,4)]);
  near(compound.netInertiaAboutXIn4,single.netInertiaAboutXIn4);
  near(compound.netInertiaAboutYIn4,single.netInertiaAboutYIn4);
  near(run([]).netInertiaAboutXIn4,32/3);
});

test('rejects overlap, out-of-section voids, missing scope and zero net section',()=>{
  for(const voids of [undefined,Array(1),[box('negative',-0.25,0,1,1)],[box('overshoot',0,0,2,4.01)],
    [box('zero',0,1,1,1)],[box('same',0,0,1,1),box('same',1,0,2,1)],
    [box('one',0,0,1.25,1),box('overlap',1,0,2,1)],[box('all',0,0,2,4)]])
    assert.throws(()=>run(voids));
});
