import assert from 'node:assert/strict';
import test from 'node:test';
import {recoverElasticFrameShearEndActions as recover} from '../dist/analysis/src/elastic-frame-shear-end-actions.js';

const base={lengthIn:12,areaIn2:2,secondMomentIn4:12,elasticModulusPsi:1200,
  shearModulusPsi:600,effectiveShearAreaIn2:2,releaseLeftRotation:false,releaseRightRotation:true,
  localEquivalentLoad:[0,-12,-24,0,-12,24],localDisplacements:[0,0,0,0,0,null]};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
const vector=(actual,expected)=>actual.forEach((value,i)=>close(value,expected[i]));

test('one released propped member recovers private shear rotation and nonzero fixed reaction',()=>{
  // EI=14400 and GAs=1200 give phi=1, Kvv=50, Kvtheta=300,
  // Ktheta-theta diag=3000, offdiag=600. Right theta=24/3000.
  const found=recover(base);
  vector(found.localDisplacements,[0,0,0,0,0,.008]);
  vector(found.localEndActions,[0,14.4,28.8,0,9.6,0]);
  assert.deepEqual(found.releasedRotationIndices,[5]);
  close(found.releasedMomentResiduals[0].momentLbIn,0);
  close(found.localEndActions[1]+found.localEndActions[4],24);
  close(found.localEndActions[2]+12*found.localEndActions[4],144);
  assert.equal(found.manufacturingApproved,false);
});

test('both releases still carry applied force while opposite rotations remain private',()=>{
  const found=recover({...base,releaseLeftRotation:true,localDisplacements:[0,0,null,0,0,null]});
  vector(found.localDisplacements,[0,0,-.01,0,0,.01]);
  vector(found.localEndActions,[0,12,0,0,12,0]);
  assert.deepEqual(found.releasedRotationIndices,[2,5]);
});

test('unreleased rigid translation/rotation induces no elastic actions',()=>{
  const found=recover({...base,releaseRightRotation:false,localEquivalentLoad:[0,0,0,0,0,0],
    localDisplacements:[1,3,.02,1,3+.02*12,.02]});
  vector(found.localEndActions,[0,0,0,0,0,0]);
  assert.deepEqual(found.releasedMomentResiduals,[]);
});

test('rejects schema/null mistakes and numerically collapsed release solve',()=>{
  for(const override of [{releaseRightRotation:undefined},{localDisplacements:[0,0,0,0,0,0]},
      {localDisplacements:[0,0,null,0,0,null]},{localEquivalentLoad:[0,0,,0,0,0]},
      {effectiveShearAreaIn2:0},{externalMetadata:'unsupported'}])
    assert.throws(()=>recover({...base,...override}));
  assert.throws(()=>recover({...base,shearModulusPsi:1e-14,releaseLeftRotation:true,
    localDisplacements:[0,0,null,0,0,null]}),/ill-conditioned/);
});
