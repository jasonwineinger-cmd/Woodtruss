import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewPlateScheduleGeometry} from '../dist/connections/src/plate-schedule-geometry.js';

const fixture=()=>{
 const revision='synthetic-r2',units='in';
 const rows=['A','B'].map(jointId=>({rowId:'row-'+jointId,jointId,faceId:'front',manufacturer:'Synthetic',
  partDesignation:'EXAMPLE',sourceLocator:'reused typical drawing callout',observation:{state:'observed',lengthIn:3,widthIn:2}}));
 const expected={revision,units,documentSha256:'f'.repeat(64),rows};
 const targets=rows.map(({rowId,jointId,faceId},i)=>({rowId,witnessId:'independent-outline-'+jointId,
  lengthAxis:i?'local-y':'local-x',face:{revision,units,jointId,faceId,frameId:'frame-'+jointId,minX:0,minY:0,maxX:8,maxY:8}}));
 const rect=(w,h)=>[{x:1,y:1},{x:1+w,y:1},{x:1+w,y:1+h},{x:1,y:1+h}];
 const readings=targets.map(({face,rowId,witnessId,lengthAxis},i)=>({rowId,witnessId,lengthAxis,
  outline:{revision,units,jointId:face.jointId,faceId:face.faceId,frameId:face.frameId,vertices:i?rect(2,3):rect(3,2)}}));
 return {expected,supplied:structuredClone(expected),targets,readings};
};
const run=({expected,supplied,targets,readings})=>reviewPlateScheduleGeometry(expected,supplied,targets,readings);
test('reused drawing callout maps only to separately witnessed exact projections',()=>{
 const input=fixture();
 const result=run(input);
 assert.equal(result.status,'SCHEDULE_PROJECTION_REVIEW_ONLY');
 assert.equal(result.matchedRows,2);
 for(const gate of ['oppositeFaceInferred','physicalDimensionsVerified','platePlacementApproved','capacityVerified',
 'engineeringApproved','fabricationAuthorized','machineReleaseAuthorized'])assert.equal(result[gate],false);
 input.readings.reverse();
 assert.deepEqual(run(input),result);
});

test('does not reuse an exact width under foreign geometry, missing witnesses or implicit orientation',()=>{
 for(const [change,hold] of [
  [i=>i.supplied.revision='synthetic-r1','SCHEDULE_UNVERIFIED'],
  [i=>i.readings[1].witnessId=i.readings[0].witnessId,'WITNESS_SCOPE_UNVERIFIED'],
  [i=>i.readings[1].outline=i.readings[0].outline,'OUTLINE_UNVERIFIED'],
  [i=>i.readings[1].outline.revision='synthetic-r1','OUTLINE_UNVERIFIED'],
  [i=>i.readings[1].outline.faceId='back','OUTLINE_UNVERIFIED'],
  [i=>i.readings[1].lengthAxis='local-x','WITNESS_SCOPE_UNVERIFIED'],
  [i=>i.readings[1].outline.vertices=i.readings[0].outline.vertices,'PROJECTED_DIMENSIONS_MISMATCH'],
  [i=>i.readings.pop(),'WITNESS_SCOPE_UNVERIFIED'],
 ]){
  const input=fixture();change(input);
  const result=run(input);
  assert.equal(result.hold,hold);
  assert.equal(result.matchedRows,0);
 }
});
