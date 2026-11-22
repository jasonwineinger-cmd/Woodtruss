import test from 'node:test';
import assert from 'node:assert/strict';
import {elasticFrameElementGlobalStiffness} from '../dist/analysis/src/elastic-frame-global-element.js';

const left={xIn:14,yIn:-6},right={xIn:-46,yIn:74};
const section={areaIn2:4,secondMomentIn4:20,elasticModulusPsi:1_000_000,
  releaseLeftRotation:false,releaseRightRotation:false};
const shear={shearModulusPsi:62_500,effectiveShearAreaIn2:2};
const base={left,right,...section};
const near=(actual,expected,relative=1e-12)=>
  assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=relative*Math.max(1,Math.abs(expected)),
    `${actual} vs ${expected}`);
const energy=(M,d)=>M.reduce((sum,row,i)=>sum+d[i]*row.reduce((v,k,j)=>v+k*d[j],0)/2,0);

test('rotated shear element has analytical transverse energy, axial invariant and endpoint reversal',()=>{
  const model=elasticFrameElementGlobalStiffness({...base,shear});
  assert.deepEqual(model.directionCosines,{cosine:-.6,sine:.8});
  assert.equal(model.shearDeformationModeled,true);
  assert.equal(model.manufacturingApproved,false);
  assert.deepEqual(model.releasedRotationIndices,[]);

  const E=section.elasticModulusPsi,I=section.secondMomentIn4,L=100;
  const phi=12*E*I/(shear.shearModulusPsi*shear.effectiveShearAreaIn2*L**2);
  const localTransverseCoefficient=12*E*I/((1+phi)*L**3);
  near(model.localMatrix[4][4],localTransverseCoefficient);
  near(energy(model.matrix,[0,0,0,-.8,-.6,0]),localTransverseCoefficient/2);
  near(energy(model.matrix,[0,0,0,-.6,.8,0]),E*section.areaIn2/(2*L));

  const reverse=elasticFrameElementGlobalStiffness({...base,left:right,right:left,shear});
  const indices=[3,4,5,0,1,2];
  reverse.matrix.forEach((row,i)=>row.forEach((value,j)=>near(value,model.matrix[indices[i]][indices[j]])));
});

test('omitted shear preserves Euler–Bernoulli; invalid keys, numbers and release combinations reject',()=>{
  const without=elasticFrameElementGlobalStiffness(base);
  assert.equal(without.shearDeformationModeled,false);
  assert.equal(without.localMatrix[4][4],240);
  const releasedWithout=elasticFrameElementGlobalStiffness({...base,releaseLeftRotation:true});
  assert.deepEqual(releasedWithout.releasedRotationIndices,[2]);
  for(const bad of [undefined,null,[],{}, {...shear,shearFactor:1}, {...shear,effectiveShearAreaIn2:0},
    {...shear,shearModulusPsi:Infinity}])
    assert.throws(()=>elasticFrameElementGlobalStiffness({...base,shear:bad}));
  for(const ends of [{releaseLeftRotation:true},{releaseRightRotation:true},{releaseLeftRotation:undefined}])
    assert.throws(()=>elasticFrameElementGlobalStiffness({...base,shear,...ends}),/releases explicitly false/);
});
