import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverElasticFrameSectionDemand as recover} from '../dist/analysis/src/elastic-frame-section-demand.js';

const fixture=()=>({
  lengthIn:12,localEndActions:[-8,15,0,0,5,0],uniform:null,point:{stationIn:3,fxLb:8,fyLb:-20},
});
const cut=(stationIn,side='continuous')=>({stationIn,side});

test('returns co-located signed axial, shear and moment in authored order, apart from extrema samples',()=>{
  const input=fixture();
  const standard=recover(input);
  assert.deepEqual(standard.requestedCuts,[]);
  const authored=[cut(8),cut(3,'right'),cut(0),cut(3,'left'),cut(12),cut(2)];
  const selected=recover(input,authored);
  assert.deepEqual(selected.requestedCuts,[
    {stationIn:8,side:'continuous',axialLb:0,shearLb:5,momentLbIn:20},
    {stationIn:3,side:'right',axialLb:0,shearLb:5,momentLbIn:45},
    {stationIn:0,side:'continuous',axialLb:8,shearLb:-15,momentLbIn:0},
    {stationIn:3,side:'left',axialLb:8,shearLb:-15,momentLbIn:45},
    {stationIn:12,side:'continuous',axialLb:0,shearLb:5,momentLbIn:0},
    {stationIn:2,side:'continuous',axialLb:8,shearLb:-15,momentLbIn:30},
  ]);
  assert.deepEqual(selected.sections,standard.sections);
  assert.deepEqual(selected.extrema,standard.extrema);
});

test('uses exact point-side identity and never snaps next-representable stations',()=>{
  const nearLeft=3-2**-51, nearRight=3+2**-51;
  const {requestedCuts}=recover(fixture(),[cut(nearLeft),cut(nearRight)]);
  assert.deepEqual(requestedCuts.map(row=>[row.stationIn,row.axialLb,row.shearLb]),[[nearLeft,8,-15],[nearRight,0,5]]);
  for (const nonmatching of [cut(3),cut(nearLeft,'left'),cut(nearRight,'right'),cut(0,'left'),cut(12,'right')])
    assert.throws(()=>recover(fixture(),[nonmatching]),/exact point-load station/);
  const smooth={lengthIn:12,localEndActions:[0,12,0,0,12,0],uniform:{qxLbPerIn:0,qyLbPerIn:-2},point:null};
  assert.throws(()=>recover(smooth,[cut(3,'left')]),/continuous/);
  assert.equal(recover(smooth,[cut(3)]).requestedCuts[0].momentLbIn,27);
});

test('rejects malformed, sparse, out-of-range, duplicate or oversized exact cut requests',()=>{
  const input=fixture();
  for (const malformed of [cut(Infinity),cut(-1),cut(13),cut('3'),cut(3,'both'),{...cut(4),label:'extra'},null])
    assert.throws(()=>recover(input,[malformed]),/exact station/);
  assert.throws(()=>recover(input,[cut(4),,cut(5)]),/dense/);
  assert.throws(()=>recover(input,null),/dense/);
  assert.throws(()=>recover(input,[cut(4),cut(4)]),/Duplicate/);
  assert.throws(()=>recover(input,[cut(3,'left'),cut(3,'left')]),/Duplicate/);
  assert.throws(()=>recover(input,[cut(-0),cut(0)]),/Duplicate/);
  assert.throws(()=>recover(input,Array.from({length:65},(_,i)=>cut(i/64))),/At most 64/);
  assert.equal(recover(input,Array.from({length:64},(_,i)=>cut(i/64))).requestedCuts.length,64);
  assert.throws(()=>recover({...input,localEndActions:[0,0,0,0,0,0]},[cut(1)]),/does not close/);
});
