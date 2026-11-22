import {test} from "node:test";
import assert from "node:assert/strict";
import {elasticFrameElementGlobalStiffness} from "../dist/analysis/src/elastic-frame-global-element.js";
import {elasticFrameElementLocalStiffness} from "../dist/analysis/src/elastic-frame-element.js";

const props={areaIn2:2,secondMomentIn4:8,elasticModulusPsi:1000,releaseLeftRotation:false,releaseRightRotation:false};
const point=(xIn,yIn)=>({xIn,yIn});
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} vs ${expected}`);
const matVec=(matrix,vector)=>matrix.map(row=>row.reduce((sum,value,i)=>sum+value*vector[i],0));
const energy=(matrix,vector)=>matVec(matrix,vector).reduce((sum,value,i)=>sum+value*vector[i]/2,0);

test("vertical member puts axial stiffness on global Y and flips transverse moment coupling onto negative X",()=>{
  const out=elasticFrameElementGlobalStiffness({...props,left:point(7,5),right:point(7,15)});
  assert.equal(out.lengthIn,10);
  assert.deepEqual(out.directionCosines,{cosine:0,sine:1});
  assert.deepEqual(out.globalDofOrder,["uxLeft","uyLeft","thetaLeft","uxRight","uyRight","thetaRight"]);
  assert.deepEqual(matVec(out.matrix,[0,0,0,1,1,0]),[-96,-200,480,96,200,480]);
  assert.equal(out.globalAssemblyVerified,false);
  assert.equal(out.manufacturingApproved,false);
});

test("inclined axial force follows its ordered axis and one-sided release preserves energy",()=>{
  const left=point(50,-30),right=point(56,-22);
  const both=elasticFrameElementGlobalStiffness({...props,left,right,releaseLeftRotation:true,releaseRightRotation:true});
  const force=matVec(both.matrix,[0,0,0,.6,.8,0]);
  force.forEach((value,i)=>near(value,[-120,-160,0,120,160,0][i]));
  const released=elasticFrameElementGlobalStiffness({...props,left,right,releaseRightRotation:true});
  const local=elasticFrameElementLocalStiffness({...props,lengthIn:10,releaseRightRotation:true});
  const globalDisplacement=[.2,-.1,.04,-.3,.5,.8];
  const localDisplacement=[.04,-.22,.04,.22,.54,.8];
  matVec(released.globalToLocalTransform,globalDisplacement).forEach((value,i)=>near(value,localDisplacement[i]));
  near(energy(released.matrix,globalDisplacement),energy(local.matrix,localDisplacement));
  assert.deepEqual(released.matrix[5],Array(6).fill(0));
  released.matrix.forEach((row,i)=>row.forEach((value,j)=>assert.equal(value,released.matrix[j][i])));
  const reversed=elasticFrameElementGlobalStiffness({...props,left:right,right:left,releaseLeftRotation:true});
  assert.deepEqual(reversed.directionCosines,{cosine:-.6,sine:-.8});
  const order=[3,4,5,0,1,2];
  reversed.matrix.forEach((row,i)=>row.forEach((value,j)=>near(value,released.matrix[order[i]][order[j]])));
});

test("rejects coincident and nonfinite endpoints, subtraction and norm overflow, and invalid stiffness",()=>{
  const left=point(0,0);
  for(const right of [left,point(Infinity,1),point(Number.NaN,1),point(1.5e308,1.5e308)])
    assert.throws(()=>elasticFrameElementGlobalStiffness({...props,left,right}),/endpoint/i);
  assert.throws(()=>elasticFrameElementGlobalStiffness({...props,left:point(-1e308,0),right:point(1e308,0)}),/distance/);
  assert.throws(()=>elasticFrameElementGlobalStiffness({...props,left,right:point(1,0),areaIn2:Number.MAX_VALUE}),/coefficients/);
});
