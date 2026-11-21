import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewPlateProjectedGaps} from '../dist/connections/src/plate-projected-gaps.js';
const target={revision:'r4',jointId:'joint',faceId:'front',frameId:'XY',units:'in'};
const face={...target,minX:0,maxX:10,minY:0,maxY:8};
const rect=(x0,y0,x1,y1)=>[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];
const plate={...target,vertices:rect(2,2,8,6)};
const member=(memberId,vertices)=>({...target,memberId,vertices});
const left=member('left',rect(0,1,4,7));
const right=member('right',rect(5,1,10,7));
const compare=(projections=[left,right],outline=plate)=>reviewPlateProjectedGaps(face,outline,['left','right'],projections);

test('reports the exact geometric gap without treating it as a permitted gap or wood area',()=>{
 const report=compare();
 assert.deepEqual(report.areas,{plateProjectedSqIn:24,memberCoveredProjectedSqIn:20,uncoveredProjectedSqIn:4});
 assert.equal(report.status,'PROJECTED_GAP_AREA_REVIEW_ONLY');
 const touching=compare([left,{...right,vertices:rect(4,1,10,7).reverse()}]);
 assert.deepEqual(touching.areas,{plateProjectedSqIn:24,memberCoveredProjectedSqIn:24,uncoveredProjectedSqIn:0});
 for(const gate of ['usableWoodAreaVerified','toothCoverageVerified','approvedGapVerified','platePlacementAccepted',
  'capacityVerified','engineeringApproved','fabricationAuthorized','machineReleaseAuthorized'])assert.equal(touching[gate],false);
});

test('does not fill unknown projections, conflicts or off-face plate area with estimated coverage',()=>{
 const missing=compare([left]);
 assert.equal(missing.hold,'MEMBER_PROJECTIONS_UNRESOLVED_OR_CONFLICTING');
 assert.deepEqual(missing.unresolvedMemberIds,['right']);
 assert.equal(missing.areas,null);
 const stale=compare([left,{...right,revision:'r3'}]);
 assert.deepEqual(stale.unresolvedMemberIds,['right']);
 assert.equal(stale.areas,null);
 const conflicting=compare([left,{...right,vertices:rect(3,1,10,7)}]);
 assert.equal(conflicting.hold,'MEMBER_PROJECTIONS_UNRESOLVED_OR_CONFLICTING');
 assert.equal(conflicting.areas,null);
 assert.equal(compare([left,right],{...plate,vertices:rect(-1,2,8,6)}).hold,'PLATE_OUTSIDE_FACE');
 assert.equal(compare([left,right],{...plate,faceId:'back'}).hold,'FACE_OR_PLATE_UNVERIFIED');
});
