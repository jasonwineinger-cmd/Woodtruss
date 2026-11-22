import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewPlateOutlineConflict} from '../dist/connections/src/plate-outline-conflict.js';

const target={revision:'r2',jointId:'joint',faceId:'front',frameId:'local',units:'in'};
const face={...target,minX:0,maxX:10,minY:0,maxY:10};
const rect=(x0,y0,x1,y1)=>[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];
const candidate=(candidateId,vertices)=>({...target,candidateId,vertices});

test('distinguishes independent edge contact, vertex contact and interior intersections',()=>{
 const a=candidate('a',rect(1,1,4,4));
 for(const [points,relation] of [
  [rect(2,2,3,3),'interior-intersection'],
  [rect(1,1,4,4).reverse(),'interior-intersection'],
  [rect(4,2,6,5),'boundary-contact'],
  [rect(4,4,7,7),'boundary-contact'],
  [rect(5,1,7,4),'disjoint'],
 ]){
  const b=candidate('b',points);
  const result=reviewPlateOutlineConflict(face,a,b);
  assert.equal(result.relation,relation);
  assert.deepEqual(reviewPlateOutlineConflict(face,b,a),result);
  for(const gate of ['clearanceRuleApplied','platePlacementAccepted','capacityVerified',
   'engineeringApproved','fabricationAuthorized','machineReleaseAuthorized'])assert.equal(result[gate],false);
 }
});
test('uses oblique edges, not only the candidate bounding boxes',()=>{
 const first=candidate('a',[{x:1,y:1},{x:5,y:1},{x:1,y:5}]); // x+y <= 6
 const second=candidate('b',[{x:3,y:4},{x:6,y:4},{x:3,y:7}]); // x+y >= 7, bounding boxes overlap
 assert.equal(reviewPlateOutlineConflict(face,first,second).relation,'disjoint');
 second.vertices=second.vertices.map(({x,y})=>({x:x-1,y}));
 assert.equal(reviewPlateOutlineConflict(face,first,second).relation,'boundary-contact');
});
test('holds same candidate identity, stale frame or face, crossing ring and off-face candidates',()=>{
 const a=candidate('a',rect(1,1,4,4));
 const b=candidate('b',rect(2,2,5,5));
 assert.equal(reviewPlateOutlineConflict(face,a,null).hold,'CANDIDATE_SCOPE_UNVERIFIED');
 assert.equal(reviewPlateOutlineConflict(face,a,{...b,candidateId:'a'}).hold,'CANDIDATE_SCOPE_UNVERIFIED');
 for(const delta of [{revision:'r1'},{faceId:'back'},{frameId:'foreign'},{units:'mm'}])
  assert.equal(reviewPlateOutlineConflict(face,a,{...b,...delta}).hold,'FACE_OR_OUTLINE_UNVERIFIED');
 const [p,q,r,s]=b.vertices;
 assert.equal(reviewPlateOutlineConflict(face,a,{...b,vertices:[p,r,q,s]}).hold,'FACE_OR_OUTLINE_UNVERIFIED');
 const off=reviewPlateOutlineConflict(face,a,{...b,vertices:rect(-1,2,5,5)});
 assert.equal(off.hold,'OUTLINE_OUTSIDE_FACE');
 assert.equal(off.relation,null);
});
