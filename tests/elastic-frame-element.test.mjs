import test from 'node:test';
import assert from 'node:assert/strict';
import {elasticFrameElementLocalStiffness} from '../dist/analysis/src/elastic-frame-element.js';

const source={lengthIn:100,areaIn2:3,secondMomentIn4:4,elasticModulusPsi:1e6,
 releaseLeftRotation:false,releaseRightRotation:false};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('local 6x6 matrix reproduces independent cantilever tip axial and bending response',()=>{
 const r=elasticFrameElementLocalStiffness(source),k=r.matrix;
 const {lengthIn:L,elasticModulusPsi:E,secondMomentIn4:I,areaIn2:A}=source;
 assert.equal(k.length,6);
 k.forEach((row,i)=>{assert.equal(row.length,6);row.forEach((value,j)=>assert.equal(value,k[j][i]));});
 const P=-240, F=100;
 const axial=F/k[3][3];
 const det=k[4][4]*k[5][5]-k[4][5]*k[5][4];
 const v=P*k[5][5]/det,theta=-P*k[5][4]/det;
 close(axial,F*L/(E*A));close(v,P*L**3/(3*E*I));close(theta,P*L**2/(2*E*I));
 assert.equal(r.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(r.manufacturingApproved,false);
});

test('one release condenses flexibility at its own end and both release all bending',()=>{
 const left=elasticFrameElementLocalStiffness({...source,releaseLeftRotation:true});
 const right=elasticFrameElementLocalStiffness({...source,releaseRightRotation:true});
 const both=elasticFrameElementLocalStiffness({...source,releaseLeftRotation:true,releaseRightRotation:true});
 for(const [out,index,retained] of [[left,2,5],[right,5,2]]){
  assert.deepEqual(out.releasedRotationIndices,[index]);
  assert.deepEqual(out.matrix[index],Array(6).fill(0));
  close(out.matrix[retained][retained],3*source.elasticModulusPsi*source.secondMomentIn4/source.lengthIn);
 }
 const onlyAxial=elasticFrameElementLocalStiffness(source).matrix[0][0];
 for(const i of [1,2,4,5])assert.deepEqual(both.matrix[i],Array(6).fill(0));
 assert.equal(both.matrix[0][3],-onlyAxial);
 assert.equal(both.matrix[3][3],onlyAxial);
});

test('rejects unsupported stiffness inputs and nonfinite coefficient arithmetic',()=>{
 for(const patch of [{lengthIn:0},{areaIn2:NaN},{secondMomentIn4:-1},{elasticModulusPsi:Infinity},
    {releaseLeftRotation:1},{areaIn2:Number.MAX_VALUE}])
   assert.throws(()=>elasticFrameElementLocalStiffness({...source,...patch}),/finite|explicit/);
});
