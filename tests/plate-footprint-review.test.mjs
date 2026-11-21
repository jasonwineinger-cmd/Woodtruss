import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewPlateFootprint} from '../dist/connections/src/plate-footprint-review.js';

const target={revision:'r2',jointId:'joint',faceId:'front',frameId:'local-Cartesian',units:'in'};
const face={...target,minX:0,maxX:12,minY:0,maxY:8};
const diamond={...target,vertices:[{x:2,y:4},{x:5,y:2},{x:8,y:4},{x:5,y:6}]};
test('reports hand-checked signed distances for a rotated outline without accepted placement',()=>{
 const result=reviewPlateFootprint(face,diamond);
 assert.deepEqual(result.margins,{leftIn:2,rightIn:4,bottomIn:2,topIn:2});
 assert.equal(result.geometryRelation,'inside');
 const slide=(x,y)=>({...diamond,vertices:diamond.vertices.map(v=>({x:v.x+x,y:v.y+y}))});
 assert.deepEqual(reviewPlateFootprint(face,slide(-3,0)).margins,{leftIn:-1,rightIn:7,bottomIn:2,topIn:2});
 assert.equal(reviewPlateFootprint(face,slide(-3,0)).geometryRelation,'protrudes');
 assert.equal(reviewPlateFootprint(face,slide(0,2)).geometryRelation,'touches');
 assert.deepEqual(reviewPlateFootprint(face,{...diamond,vertices:[...diamond.vertices].reverse()}),result);
 for(const gate of ['requiredEdgeDistanceAssessed','platePlacementAccepted','capacityVerified','engineeringApproved',
  'fabricationAuthorized','machineReleaseAuthorized'])assert.equal(result[gate],false);
});
test('holds stale/wrong faces, missing dimensions and nonconvex or crossing geometry',()=>{
 assert.equal(reviewPlateFootprint(null,diamond).hold,'MISSING_FACE');
 assert.equal(reviewPlateFootprint(face,null).hold,'MISSING_OUTLINE');
 for(const mismatch of [{revision:'r1'},{faceId:'back'},{jointId:'other'},{frameId:'unbound'},{units:'mm'}]){
  const held=reviewPlateFootprint(face,{...diamond,...mismatch});
  assert.equal(held.hold,'FACE_TARGET_MISMATCH');
  assert.equal(held.margins,null);
 }
 const [a,b,c,d]=diamond.vertices;
 for(const vertices of [[],[a,c,b,d],[a,b,a,d],[a,b,d,{x:5,y:4}],[a,b,c,{x:NaN,y:5}]]){
  const held=reviewPlateFootprint(face,{...diamond,vertices});
  assert.equal(held.hold,'INVALID_FACE_OR_OUTLINE');
  assert.equal(held.geometryRelation,null);
 }
 assert.equal(reviewPlateFootprint({...face,maxX:0},diamond).hold,'INVALID_FACE_OR_OUTLINE');
});
