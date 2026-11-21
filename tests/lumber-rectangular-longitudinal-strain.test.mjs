import test from 'node:test';
import assert from 'node:assert/strict';
import {studyRectangularLongitudinalStrain as study} from '../dist/lumber/src/index.js';

// Synthetic values; no reference to a licensed standard.
const inputs={actualWidthIn:2,actualDepthIn:4,axialForceLb:-80,momentAboutWidthLbIn:128,
  momentAboutDepthLbIn:32,longitudinalModulusPsi:2000};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-12,`${actual} expected ${expected}`);

test('reports tensile/compressive longitudinal strains and two distinct axis gradients',()=>{
  const report=study(inputs);
  assert.equal(report.strainUnit,'in/in');
  near(report.centroidStrain,-0.005);
  near(report.strainGradientAlongWidthPerIn,0.006);
  near(report.strainGradientAlongDepthPerIn,-0.006);
  for(const [i,want] of [0.001,-0.023,0.013,-0.011].entries()) {
    const f=report.cornerStrains[i];
    near(f.combinedLongitudinalStrain,want);
    near(f.combinedLongitudinalStrain,report.centroidStrain+
      f.xIn*report.strainGradientAlongWidthPerIn+f.yIn*report.strainGradientAlongDepthPerIn);
  }
  near(report.maxTensileStrain,0.013);
  near(report.maxCompressiveStrainMagnitude,0.023);
  assert.equal(report.approvedForStructuralUse,false);
});

test('recovers signed loads from the elastic strain field and reverses opposite corners',()=>{
  const r=study(inputs), E=inputs.longitudinalModulusPsi;
  near(E*r.section.areaIn2*r.centroidStrain,inputs.axialForceLb);
  near(-E*r.section.inertiaAboutWidthIn4*r.strainGradientAlongDepthPerIn,inputs.momentAboutWidthLbIn);
  near(E*r.section.inertiaAboutDepthIn4*r.strainGradientAlongWidthPerIn,inputs.momentAboutDepthLbIn);
  const reverse=study({...inputs,momentAboutWidthLbIn:-128,momentAboutDepthLbIn:-32});
  r.cornerStrains.forEach((f,i)=>near(f.combinedLongitudinalStrain,reverse.cornerStrains[3-i].combinedLongitudinalStrain));
  near(study({...inputs,longitudinalModulusPsi:4000}).maxTensileStrain,r.maxTensileStrain/2);
});

test('does not infer missing modulus, dimensions or signed moments; rejects nonfinite strain',()=>{
  for(const variation of [{longitudinalModulusPsi:undefined},{longitudinalModulusPsi:0},{longitudinalModulusPsi:Infinity},
    {longitudinalModulusPsi:Number.MIN_VALUE},{actualWidthIn:-1},{momentAboutWidthLbIn:undefined}])
    assert.throws(()=>study({...inputs,...variation}));
});
