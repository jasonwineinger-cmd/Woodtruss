import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewPlateMemberOverlap} from '../dist/connections/src/plate-member-overlap-review.js';

const target={revision:'r2',jointId:'synthetic',faceId:'front',frameId:'local',units:'in'};
const face={...target,minX:0,maxX:10,minY:0,maxY:10};
const rect=(x0,y0,x1,y1)=>[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];
const plate={...target,vertices:rect(0,0,4,4)};
const member=(memberId,vertices)=>({...target,memberId,vertices});
test('keeps separate exact hand-checked overlap, tangency zero and missing projection',()=>{
 const first=member('first',rect(2,1,6,3)); // overlap [2,4]×[1,3] = 4
 const second=member('second',rect(1,2,4,5).reverse()); // overlap [1,4]×[2,4] = 6; overlaps first
 const touch=member('touch',rect(4,0,6,4));
 const result=reviewPlateMemberOverlap(face,plate,['first','second','touch','missing'],[second,first,touch]);
 assert.deepEqual(result.rows,[
  {memberId:'first',state:'GEOMETRY_ONLY',projectedOverlapSqIn:4},
  {memberId:'second',state:'GEOMETRY_ONLY',projectedOverlapSqIn:6},
  {memberId:'touch',state:'GEOMETRY_ONLY',projectedOverlapSqIn:0},
  {memberId:'missing',state:'MISSING_PROJECTION',projectedOverlapSqIn:null},
 ]);
 assert.equal(result.unresolvedCount,1);
 assert.equal(result.toothCoverageVerified,false);
 assert.equal(result.aggregateUsableAreaVerified,false);
 assert.equal(result.platePlacementAccepted,false);
 assert.equal(result.fabricationAuthorized,false);
 assert.equal(Object.keys(result).includes('totalOverlapSqIn'),false);
});

test('holds malformed scope and keeps stale or crossing member evidence unresolved',()=>{
 const a=member('a',rect(1,1,2,2));
 assert.equal(reviewPlateMemberOverlap(face,plate,['a'],[a,a]).hold,'MEMBER_SCOPE_UNVERIFIED');
 assert.equal(reviewPlateMemberOverlap(face,plate,['a','a'],[a]).hold,'MEMBER_SCOPE_UNVERIFIED');
 assert.equal(reviewPlateMemberOverlap(face,plate,['b'],[a]).hold,'MEMBER_SCOPE_UNVERIFIED');
 assert.equal(reviewPlateMemberOverlap(face,{...plate,faceId:'other'},['a'],[a]).hold,'PLATE_OR_FACE_UNVERIFIED');
 const [i,j,k,l]=a.vertices;
 for(const projection of [{...a,revision:'r1'},{...a,frameId:'foreign'},{...a,vertices:[i,k,j,l]},
  {...a,vertices:rect(9,9,11,11)}]){
  const result=reviewPlateMemberOverlap(face,plate,['a'],[projection]);
  assert.deepEqual(result.rows,[{memberId:'a',state:'UNVERIFIED_PROJECTION',projectedOverlapSqIn:null}]);
 }
});

test('rotated clipping preserves triangular half-square area',()=>{
 const triangle=[{x:3,y:3},{x:5,y:3},{x:3,y:5}];
 const insert=member('triangular-tail',triangle);
 // The overlapping [3,4]×[3,4] square is cut by the triangle edge only at its corner.
 assert.equal(reviewPlateMemberOverlap(face,plate,['triangular-tail'],[insert]).rows[0].projectedOverlapSqIn,1);
 const shifted=member('triangular-tail',triangle.map(({x,y})=>({x:x+1,y:y-1})));
 assert.equal(reviewPlateMemberOverlap(face,plate,['triangular-tail'],[shifted]).rows[0].projectedOverlapSqIn,0);
 const diagonal=member('triangular-tail',[{x:3,y:3},{x:4,y:3},{x:3,y:4}]);
 assert.equal(reviewPlateMemberOverlap(face,plate,['triangular-tail'],[diagonal]).rows[0].projectedOverlapSqIn,.5);
});
