import test from 'node:test';
import assert from 'node:assert/strict';
import {studyRectangularEccentricAxial as study} from '../dist/lumber/src/index.js';

const input={actualWidthIn:2,actualDepthIn:4,axialForceLb:80,eccentricityAlongWidthIn:0.25,eccentricityAlongDepthIn:0.5};
const near=(got,want)=>assert.ok(Math.abs(got-want)<1e-9,`${got} expected ${want}`);

test('maps signed centroidal eccentricities into biaxial resultants without material assumptions',()=>{
  const r=study(input);
  assert.deepEqual(r.input,{axialForceLb:80,momentAboutWidthLbIn:-40,momentAboutDepthLbIn:20});
  assert.deepEqual(r.peakAxialFiberStresses.map(f=>f.combinedNormalPsi),[-5,10,10,25]);
  // Reconstruct the force and two first moments by integrating the planar stress field.
  const [minus, , ,plus]=r.peakAxialFiberStresses;
  const gradX=(r.peakAxialFiberStresses[2].combinedNormalPsi-minus.combinedNormalPsi)/2;
  const gradY=(r.peakAxialFiberStresses[1].combinedNormalPsi-minus.combinedNormalPsi)/4;
  near(r.section.areaIn2*(minus.combinedNormalPsi+plus.combinedNormalPsi)/2,80);
  near(r.section.inertiaAboutDepthIn4*gradX,80*0.25);
  near(r.section.inertiaAboutWidthIn4*gradY,80*0.5);
  assert.equal(r.approvedForStructuralUse,false);
});

test('centering removes both moments; force reversal flips all stress signs',()=>{
  const centered=study({...input,eccentricityAlongWidthIn:0,eccentricityAlongDepthIn:0});
  assert.equal(centered.input.momentAboutWidthLbIn,0);
  assert.equal(centered.input.momentAboutDepthLbIn,0);
  assert.deepEqual(centered.peakAxialFiberStresses.map(f=>f.combinedNormalPsi),[10,10,10,10]);
  assert.deepEqual(study({...input,axialForceLb:-80}).peakAxialFiberStresses.map(f=>f.combinedNormalPsi),
    study(input).peakAxialFiberStresses.map(f=>-f.combinedNormalPsi));
});

test('requires explicit offsets and force and does not allow overflow',()=>{
  for(const changed of [{eccentricityAlongDepthIn:undefined},{eccentricityAlongWidthIn:Infinity},
    {axialForceLb:undefined},{actualDepthIn:0},{axialForceLb:1e308,eccentricityAlongDepthIn:5}])
    assert.throws(()=>study({...input,...changed}));
});
