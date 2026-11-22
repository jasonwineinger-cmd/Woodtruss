import assert from 'node:assert/strict';
import test from 'node:test';
import {createInclinedSupportAxis as axis} from '../dist/geometry/src/inclined-support-axis.js';

const close=(x,y)=>assert.ok(Math.abs(x-y)<1e-12, `${x} != ${y}`);
const direction=(dx,dy)=>axis({kind:'direction',dx,dy});
const angle=ccwFromGlobalXDeg=>axis({kind:'angle-degrees',ccwFromGlobalXDeg});

test('authored 3–4 direction gives unit global basis and exact signed force decomposition',()=>{
  const b=direction(3,4);
  assert.deepEqual(b.freeGlobal,{x:.6,y:.8});
  assert.deepEqual(b.constrainedNormalGlobal,{x:-.8,y:.6});
  const load=b.globalToLocal({x:10,y:-5});
  close(load.alongFree,2);
  close(load.alongConstrainedNormal,-11);
  const back=b.localToGlobal(load);
  close(back.x,10);
  close(back.y,-5);
  close(b.globalToLocal(b.freeGlobal).alongConstrainedNormal,0);
  assert.equal(b.physicalFixityInferred,false);
  assert.equal(b.bearingCapacityVerified,false);
  assert.equal(b.fabricationAuthorized,false);
});

test('authored angles and reversed bases preserve handedness and signed components',()=>{
  const angled=angle(-30);
  close(angled.freeGlobal.x,Math.sqrt(3)/2);
  close(angled.freeGlobal.y,-.5);
  close(angled.constrainedNormalGlobal.x,.5);
  assert.deepEqual(angle(270).freeGlobal,{x:0,y:-1});
  assert.deepEqual(angle(-270).constrainedNormalGlobal,{x:-1,y:0});
  assert.deepEqual(angle(-360).freeGlobal,{x:1,y:0});
  const rev=direction(-3,-4).globalToLocal({x:10,y:-5});
  close(rev.alongFree,-2);
  close(rev.alongConstrainedNormal,11);
});

test('finite extreme scales normalize, invalid authored or transformed values fail closed',()=>{
  for (const s of [Number.MIN_VALUE,Number.MAX_VALUE]){
    const a=direction(s,s);
    close(a.freeGlobal.x,Math.SQRT1_2);
    close(a.freeGlobal.y,Math.SQRT1_2);
  }
  for(const make of [()=>direction(0,0),()=>direction(Infinity,1),()=>angle(NaN),
                     ()=>angle(361),()=>axis({kind:'auto'})]){
    assert.throws(make,RangeError);
  }
  assert.throws(()=>direction(1,1).globalToLocal({x:Number.MAX_VALUE,y:Number.MAX_VALUE}),RangeError);
  assert.throws(()=>angle(0).localToGlobal({alongFree:2,alongConstrainedNormal:Infinity}),RangeError);
});
