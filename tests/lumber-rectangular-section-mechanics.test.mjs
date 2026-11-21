import test from 'node:test';
import assert from 'node:assert/strict';
import { studyPreliminaryRectangularSection as study } from '../dist/lumber/src/index.js';

const input={actualWidthIn:2,actualDepthIn:4,axialForceLb:-80,momentAboutWidthLbIn:128,momentAboutDepthLbIn:32};
const near=(got,want)=>assert.ok(Math.abs(got-want)<1e-9,`${got} expected ${want}`);

test('keeps distinct principal inertias, bending signs and all four fiber contributions',()=>{
  const result=study(input);
  assert.equal(result.section.areaIn2,8);
  near(result.section.inertiaAboutWidthIn4,32/3);
  near(result.section.inertiaAboutDepthIn4,8/3);
  near(result.section.modulusAboutWidthIn3,16/3);
  near(result.section.modulusAboutDepthIn3,8/3);
  assert.deepEqual(result.peakAxialFiberStresses.map(f=>[f.xIn,f.yIn,f.axialPsi,
    Math.round(f.widthMomentPsi),Math.round(f.depthMomentPsi),Math.round(f.combinedNormalPsi)]),[
    [-1,-2,-10,24,-12,2],[-1,2,-10,-24,-12,-46],[1,-2,-10,24,12,26],[1,2,-10,-24,12,-22],
  ]);
  near(result.maxTensionPsi,26);
  near(result.maxCompressionMagnitudePsi,46);
  assert.equal(result.approvedForStructuralUse,false);
});

test('reversing moments swaps opposite corners and pure tension or compression stays explicit',()=>{
  const result=study(input), reverse=study({...input,momentAboutWidthLbIn:-128,momentAboutDepthLbIn:-32});
  assert.deepEqual(reverse.peakAxialFiberStresses.map(f=>f.combinedNormalPsi),
    result.peakAxialFiberStresses.map(f=>f.combinedNormalPsi).reverse());
  const noMoments={...input,momentAboutWidthLbIn:0,momentAboutDepthLbIn:0};
  assert.equal(study(noMoments).maxTensionPsi,0);
  assert.equal(study({...noMoments,axialForceLb:80}).maxCompressionMagnitudePsi,0);
});

test('fails closed with missing moments, nonfinite demand or unusable actual dimensions',()=>{
  for(const variant of [{...input,momentAboutDepthLbIn:undefined},{...input,axialForceLb:Infinity},
    {...input,actualWidthIn:0},{...input,actualDepthIn:1e200},
    {...input,actualWidthIn:0.5,actualDepthIn:0.5,momentAboutWidthLbIn:1e308}])
    assert.throws(()=>study(variant));
});
