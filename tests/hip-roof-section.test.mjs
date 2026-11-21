import assert from 'node:assert/strict';
import test from 'node:test';
import {generateEqualPitchHipTransverseSection as section} from '../dist/geometry/src/hip-roof-section.js';

const roof={lengthFt:40,widthFt:24,pitchRisePer12:6};
const cross=(stationIn)=>section({...roof,stationIn});
const yz=(r)=>r.surface.map(({y,z})=>[y,z]);

test('both hip-end planes truncate a transverse section before the central ridge',()=>{
  const near=cross(72),far=cross(408);
  assert.equal(near.sectionRegion,'near-end-plane');
  assert.equal(far.sectionRegion,'far-end-plane');
  assert.equal(near.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
  assert.equal(near.fabricationAuthorized,false);
  for(const result of [near,far]){
    assert.deepEqual(yz(result),[[0,0],[72,36],[216,36],[288,0]]);
    assert.ok(result.surface.every(({x})=>x===result.stationIn));
  }
});

test('ridge endpoints and interior collapse to one unique apex, preserving the equal pitch',()=>{
  for(const x of [144,240,336]){
    const result=cross(x);
    assert.equal(result.sectionRegion,'ridge');
    assert.deepEqual(yz(result),[[0,0],[144,72],[288,0]]);
  }
  // Independently evaluate all four roof planes at the emitted breakpoints.
  for(const stationIn of [1,72,143.5,144,200,336,336.5,408,479]){
    const result=cross(stationIn);
    for(const {x,y,z} of result.surface){
      const expected=Math.min(x/2, (480-x)/2, y/2, (288-y)/2);
      assert.equal(z,expected);
    }
  }
});

test('rejects unsupported station and roof inputs while retaining the 50-foot cap',()=>{
  for(const station of [0,-1,480,481,Infinity,NaN])assert.throws(()=>cross(station),/station/);
  assert.doesNotThrow(()=>section({...roof,lengthFt:50,stationIn:599}));
  for(const invalid of [
    {lengthFt:50.001},{widthFt:51},{lengthFt:24},{overhangIn:1},{heelHeightIn:1},{pitchRisePer12:0},
  ])assert.throws(()=>section({...roof,stationIn:72,...invalid}));
});
