import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewPlateCoverageConflicts} from '../dist/connections/src/plate-coverage-conflicts.js';
const target={revision:'r2',jointId:'synthetic',faceId:'front',frameId:'local',units:'in'};
const rect=(x0,y0,x1,y1)=>[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];
const face={...target,minX:0,maxX:12,minY:0,maxY:12};
const plate={...target,vertices:rect(2,2,6,6)};
const projection=(memberId,...bounds)=>({...target,memberId,vertices:rect(...bounds)});

test('reports the three independent pairs of a triple overlap without an additive area',()=>{
 const a=projection('A',1,1,5,5),b=projection('B',3,3,7,7),c=projection('C',3,3,5,5);
 c.vertices.reverse();
 const result=reviewPlateCoverageConflicts(face,plate,['A','B','C','missing'],[c,b,a]);
 assert.equal(result.hold,'OVERLAPPING_MEMBER_COVERAGE');
 // Every pair covers the same 2×2 square. This is not 12 square inches of wood.
 assert.deepEqual(result.conflicts,[
  {memberIds:['A','B'],sharedProjectedSqIn:4},{memberIds:['A','C'],sharedProjectedSqIn:4},
  {memberIds:['B','C'],sharedProjectedSqIn:4},
 ]);
 assert.deepEqual(result.unresolvedMemberIds,['missing']);
 assert.equal(result.additiveAreaVerified,false);
 assert.equal(result.memberOwnershipApproved,false);
 assert.equal(result.toothCoverageVerified,false);
 assert.equal(result.platePlacementAccepted,false);
 assert.equal(result.fabricationAuthorized,false);
});

test('distinguishes shared boundary, overlap outside the plate, and unresolved registration',()=>{
 const a=projection('A',1,2,4,8),b=projection('B',4,2,6,8);
 const noConflict=reviewPlateCoverageConflicts(face,plate,['A','B'],[a,b]);
 assert.equal(noConflict.status,'NO_PROJECTED_CONFLICT_FOUND_REVIEW_ONLY');
 assert.deepEqual(noConflict.conflicts,[]);
 // A/C overlap only above the outline; C touches the plate at y=6.
 const c=projection('C',2,6,5,10);
 assert.equal(reviewPlateCoverageConflicts(face,plate,['A','C'],[a,c]).hold,null);
 assert.equal(reviewPlateCoverageConflicts(face,plate,['A','B'],[a,{...b,revision:'r1'}]).hold,
  'MEMBER_COVERAGE_UNRESOLVED');
 assert.equal(reviewPlateCoverageConflicts(face,plate,['A','B'],[a,a]).hold,'INPUT_SCOPE_UNVERIFIED');
 assert.equal(reviewPlateCoverageConflicts(face,plate,['A'],[b]).hold,'INPUT_SCOPE_UNVERIFIED');
 assert.equal(reviewPlateCoverageConflicts(face,{...plate,frameId:'wrong'},['A'],[a]).hold,'INPUT_SCOPE_UNVERIFIED');
});

test('flags identical projected polygons under different member IDs as a conflict, not proof of common ownership',()=>{
 const a=projection('A',3,3,5,4),b=projection('B',3,3,5,4);
 const result=reviewPlateCoverageConflicts(face,plate,['A','B'],[a,b]);
 assert.equal(result.hold,'OVERLAPPING_MEMBER_COVERAGE');
 assert.deepEqual(result.conflicts,[{memberIds:['A','B'],sharedProjectedSqIn:2}]);
 assert.equal(result.memberOwnershipApproved,false);
});
