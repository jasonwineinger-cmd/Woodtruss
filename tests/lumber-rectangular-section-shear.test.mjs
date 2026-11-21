import test from 'node:test';
import assert from 'node:assert/strict';
import {studyPreliminaryRectangularShear as study} from '../dist/lumber/src/index.js';

const input={actualWidthIn:2,actualDepthIn:4,shearAlongWidthLb:80,shearAlongDepthLb:-120,samples:[
  {xIn:0,yIn:0},{xIn:0.5,yIn:-1},{xIn:-0.5,yIn:1},{xIn:-1,yIn:0},{xIn:1,yIn:0},
  {xIn:0,yIn:-2},{xIn:0,yIn:2},
]};
const equals=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9);

test('resolves separate signed parabolas with zeros at their own faces',()=>{
  const r=study(input);
  assert.equal(r.areaIn2,8);
  equals(r.centerWidthShearPsi,15);
  equals(r.centerDepthShearPsi,-22.5);
  equals(r.shearSamples[1].widthShearPsi,11.25);
  equals(r.shearSamples[1].depthShearPsi,-16.875);
  equals(r.shearSamples[2].widthShearPsi,r.shearSamples[1].widthShearPsi);
  equals(r.shearSamples[2].depthShearPsi,r.shearSamples[1].depthShearPsi);
  for(const i of [3,4]){
    equals(r.shearSamples[i].widthShearPsi,0);
    equals(r.shearSamples[i].depthShearPsi,-22.5);
  }
  for(const i of [5,6]){
    equals(r.shearSamples[i].depthShearPsi,0);
    equals(r.shearSamples[i].widthShearPsi,15);
  }
  assert.equal(r.approvedForStructuralUse,false);
  assert.equal('passes' in r,false);
});

test('each parabolic profile integrates to the original signed shear over the section',()=>{
  const r=study(input);
  const q=r.shearSamples;
  // Simpson rule is exact for quadratics; integrate transverse to each profile.
  equals(input.actualDepthIn*(input.actualWidthIn/6)*
    (q[3].widthShearPsi+4*q[0].widthShearPsi+q[4].widthShearPsi),80);
  equals(input.actualWidthIn*(input.actualDepthIn/6)*
    (q[5].depthShearPsi+4*q[0].depthShearPsi+q[6].depthShearPsi),-120);
});

test('does not substitute defaults for missing shears or sample an invalid section location',()=>{
  for(const candidate of [
    {...input,shearAlongDepthLb:undefined},{...input,actualDepthIn:0},{...input,actualWidthIn:Infinity},
    {...input,actualWidthIn:1e300,actualDepthIn:1e300},{...input,samples:[]},
    {...input,samples:[{xIn:1.01,yIn:0}]},{...input,samples:[{xIn:0,yIn:-2.01}]},
  ]) assert.throws(()=>study(candidate));
});
