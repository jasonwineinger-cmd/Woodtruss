import test from 'node:test';
import assert from 'node:assert/strict';
import {studyPreliminarySteppedAxialDeformation as study} from '../dist/lumber/src/index.js';

const steps=[{segmentId:'first',lengthIn:12,areaIn2:2,longitudinalModulusPsi:1000},
  {segmentId:'second',lengthIn:8,areaIn2:4,longitudinalModulusPsi:2000}];
const near=(got,want)=>assert.ok(Math.abs(got-want)<1e-12,`${got} expected ${want}`);

test('computes signed stepped stresses and continuous displacement along a serial bar',()=>{
  const r=study({axialForceLb:-20,segments:steps});
  assert.equal(r.totalLengthIn,20);
  assert.deepEqual(r.segments.map(x=>x.normalStressPsi),[-10,-5]);
  assert.deepEqual(r.segments.map(x=>x.axialStrain),[-0.01,-0.0025]);
  near(r.segments[0].lengthChangeIn,-0.12);
  near(r.segments[1].lengthChangeIn,-0.02);
  assert.equal(r.segments[0].endStationIn,r.segments[1].startStationIn);
  assert.equal(r.segments[0].endDisplacementIn,r.segments[1].startDisplacementIn);
  near(r.totalSignedLengthChangeIn,-0.14);
  near(r.equivalentStiffnessLbPerIn,1/0.007);
  near(r.elasticStrainEnergyLbIn,1.4);
  assert.equal(r.approvedForStructuralUse,false);
});

test('recovers force by equivalent compliance and energy by sum over segments',()=>{
  const r=study({axialForceLb:20,segments:steps});
  near(r.totalSignedLengthChangeIn*r.equivalentStiffnessLbPerIn,20);
  near(r.segments.reduce((s,x)=>s+x.normalStressPsi*x.axialStrain*x.areaIn2*x.lengthIn/2,0),
    r.elasticStrainEnergyLbIn);
  const reverse=study({axialForceLb:20,segments:[...steps].reverse()});
  near(r.totalSignedLengthChangeIn,reverse.totalSignedLengthChangeIn);
  assert.deepEqual(reverse.segments.map(x=>x.segmentId),['second','first']);
  assert.equal(study({axialForceLb:0,segments:steps}).totalSignedLengthChangeIn,0);
});

test('rejects duplicate identity, missing material assumptions, no segments or overflow',()=>{
  for(const segments of [[],[steps[0],steps[0]],
    [{...steps[0],longitudinalModulusPsi:undefined}],[{...steps[0],areaIn2:0}],
    [{...steps[0],areaIn2:1e308,longitudinalModulusPsi:1e308}]])
    assert.throws(()=>study({axialForceLb:20,segments}));
  assert.throws(()=>study({segments:steps}));
});
