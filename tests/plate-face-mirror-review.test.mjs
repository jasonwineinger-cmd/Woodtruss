import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewPlateFaceMirror} from '../dist/connections/src/plate-face-mirror-review.js';

const scope={revision:'r2',jointId:'sample',units:'in'};
const expected={...scope,frontFaceId:'front',backFaceId:'back',frontFrameId:'front-X/Y',backFrameId:'back-X/Y'};
const frontSource={...scope,faceId:'front',frameId:'front-X/Y'};
const backSource={...scope,faceId:'back',frameId:'back-X/Y'};
const front={face:{...frontSource,minX:0,maxX:10,minY:0,maxY:6},
 outline:{...frontSource,vertices:[{x:1,y:1},{x:4,y:1},{x:2,y:5}]}};
const back={face:{...backSource,minX:10,maxX:20,minY:3,maxY:9},
 outline:{...backSource,vertices:[{x:18,y:8},{x:16,y:4},{x:19,y:4}]}};
const mirror={reflectedAxis:'x',translateXIn:20,translateYIn:3};

test('compares two independently registered asymmetric outlines only after explicit mirror',()=>{
 const result=reviewPlateFaceMirror(expected,front,back,mirror);
 assert.equal(result.frontRelation,'inside');
 assert.equal(result.backRelation,'inside');
 assert.equal(result.projectedFaceBoundariesCoincide,true);
 assert.equal(result.projectedOutlinesCoincide,true);
 assert.equal(result.physicalFaceRegistrationVerified,false);
 assert.equal(result.pairedPlacementAccepted,false);
 assert.equal(result.fabricationAuthorized,false);

 const shifted={...back,outline:{...back.outline,vertices:back.outline.vertices.map(v=>({...v,x:v.x+2}))}};
 const altered=reviewPlateFaceMirror(expected,front,shifted,mirror);
 assert.equal(altered.frontRelation,'inside');
 assert.equal(altered.backRelation,'protrudes');
 assert.equal(altered.projectedFaceBoundariesCoincide,true);
 assert.equal(altered.projectedOutlinesCoincide,false);
});

test('does not reuse front as back, accept stale or borrowed frame, or infer missing mirror',()=>{
 assert.equal(reviewPlateFaceMirror(expected,front,front,mirror).hold,'FACE_PAIR_UNVERIFIED');
 assert.equal(reviewPlateFaceMirror(expected,front,{...back,face:{...back.face,revision:'r1'}},mirror).hold,'FACE_PAIR_UNVERIFIED');
 assert.equal(reviewPlateFaceMirror(expected,front,{...back,outline:{...back.outline,frameId:'front-X/Y'}},mirror).hold,'OUTLINE_UNVERIFIED');
 const held=reviewPlateFaceMirror(expected,front,back,null);
 assert.equal(held.hold,'EXPLICIT_MIRROR_UNVERIFIED');
 assert.equal(held.frontRelation,'inside');
 assert.equal(held.backRelation,'inside');
 assert.equal(held.projectedOutlinesCoincide,null);
});
