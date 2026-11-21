import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewPlateFootprintRevision} from '../dist/connections/src/plate-footprint-revision-review.js';
const scope={jointId:'synthetic',faceId:'front',frameId:'local',units:'in'};
const expected={...scope,earlierRevision:'r2',laterRevision:'r3'};
const rect=(x0,y0,x1,y1)=>[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];
const review=(revision,late=false)=>{
 const base={...scope,revision};
 return {
  face:{...base,minX:0,maxX:late?11:10,minY:0,maxY:9},
  outline:{...base,vertices:late?[{x:2,y:5},{x:5,y:2},{x:8,y:5},{x:5,y:8}]:rect(3,3,7,7)},
  expectedMemberIds:['left','right'],
  memberProjections:[{...base,memberId:'left',vertices:rect(0,0,5,9)},
   {...base,memberId:'right',vertices:rect(late?5:6,0,10,9)}],
 };
};

test('compares a square and rotated outline with changed face boundary and hand-checked coverage',()=>{
 const earlier=review('r2'),later=review('r3',true);
 const result=reviewPlateFootprintRevision(expected,earlier,later);
 assert.equal(result.status,'FOOTPRINT_REVISION_GEOMETRY_ONLY');
 assert.deepEqual(result.marginDeltaIn,{leftIn:-1,rightIn:0,bottomIn:-1,topIn:-1});
 assert.deepEqual(result.faceBoundaryDeltaIn,{leftIn:0,rightIn:1,bottomIn:0,topIn:0});
 // Square area 16 with a 4-square-inch strip uncovered; diamond area 18 with zero uncovered.
 assert.deepEqual(result.coverageAreaDeltaSqIn,{plateProjectedSqIn:2,memberCoveredProjectedSqIn:6,uncoveredProjectedSqIn:-4});
 for(const gate of ['usableWoodAreaVerified','platePlacementAccepted','capacityVerified',
  'engineeringApproved','fabricationAuthorized','machineReleaseAuthorized'])assert.equal(result[gate],false);
});

test('holds stale revision or changed coordinate basis and isolates unresolved coverage',()=>{
 const earlier=review('r2'),later=review('r3',true);
 for(const change of [{revision:'r2'},{frameId:'other'},{faceId:'back'},{jointId:'foreign'},{units:'mm'}]){
  const result=reviewPlateFootprintRevision(expected,earlier,{...later,face:{...later.face,...change}});
  assert.equal(result.hold,'REVISION_OR_COORDINATE_BASIS_MISMATCH');
  assert.equal(result.marginDeltaIn,null);
 }
 const stale=reviewPlateFootprintRevision(expected,earlier,{...later,outline:{...later.outline,revision:'r2'}});
 assert.equal(stale.hold,'FOOTPRINT_GEOMETRY_UNVERIFIED');
 const gone={...later,memberProjections:later.memberProjections.slice(0,1)};
 const missing=reviewPlateFootprintRevision(expected,earlier,gone);
 assert.ok(missing.marginDeltaIn);
 assert.equal(missing.coverageAreaDeltaSqIn,null);
 assert.deepEqual(missing.coverageHolds,['LATER_COVERAGE_UNRESOLVED']);
 const changedScope=reviewPlateFootprintRevision(expected,earlier,{...gone,expectedMemberIds:['left']});
 assert.equal(changedScope.coverageAreaDeltaSqIn,null);
 assert.deepEqual(changedScope.coverageHolds,['MEMBER_SCOPE_CHANGED']);
});
