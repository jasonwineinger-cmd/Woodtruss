import assert from 'node:assert/strict';
import test from 'node:test';
import {locateAuthoredMemberStation as locate} from '../dist/geometry/src/member-station.js';

const startIn={x:10,y:-20},endIn={x:130,y:140};
const at=(pointIn)=>locate({startIn,endIn,pointIn});
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10, String(actual));

test('authored rotated station separates location along member and signed eccentricity',()=>{
  const source={x:38,y:26}; // 53.6 along +(.6,.8), 5.2 along +(-.8,.6)
  const found=at(source);
  close(found.lengthIn,200);
  close(found.stationFromStartIn,53.6);
  close(found.stationFromEndIn,-146.4);
  close(found.signedNormalOffsetIn,5.2);
  close(found.projectedPointIn.x,42.16);
  close(found.projectedPointIn.y,22.88);
  assert.equal(found.longitudinal,'interior-station');
  assert.equal(found.transverse,'positive-normal');
  const reverse=locate({startIn:endIn,endIn:startIn,pointIn:source});
  close(reverse.stationFromStartIn,146.4);
  close(reverse.signedNormalOffsetIn,-5.2);
  assert.equal(reverse.transverse,'negative-normal');
  assert.equal(found.graphAttachmentEstablished,false);
  assert.equal(found.loadTransferEstablished,false);
  assert.equal(found.fabricationAuthorized,false);
});

test('endpoint station does not mean endpoint coincidence; beyond remains beyond',()=>{
  const xs=[[-1,'before-start'],[0,'at-start-station'],[250,'interior-station'],
            [600,'at-end-station'],[601,'after-end']];
  for(const [x,expected] of xs){
    const found=locate({startIn:{x:0,y:0},endIn:{x:600,y:0},pointIn:{x,y:-7}});
    assert.equal(found.longitudinal,expected);
    assert.equal(found.transverse,'negative-normal');
    assert.deepEqual(found.projectedPointIn,{x,y:0});
  }
  const tiny=locate({startIn:{x:0,y:0},endIn:{x:600,y:0},pointIn:{x:-1e-10,y:0}});
  assert.equal(tiny.longitudinal,'at-start-station');
  assert.equal(tiny.stationFromStartIn,-1e-10); // never snap
  assert.equal(tiny.transverse,'on-axis');
});

test('rejects invalid, indistinguishable and over-50-ft authored centerlines',()=>{
  for(const override of [{endIn:startIn},{endIn:{x:10+1e-9,y:-20}},
    {endIn:{x:610.001,y:-20}},{pointIn:{x:NaN,y:0}},{startIn:{x:-Infinity,y:0}}]){
    assert.throws(()=>locate({startIn,endIn,pointIn:{x:100,y:100},...override}),RangeError);
  }
});
