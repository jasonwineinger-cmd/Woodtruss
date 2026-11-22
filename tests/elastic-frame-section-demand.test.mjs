import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverElasticFrameSectionDemand as recover} from '../dist/analysis/src/elastic-frame-section-demand.js';

const input=()=>({lengthIn:12,localEndActions:[0,12,0,0,12,0],uniform:{qxLbPerIn:0,qyLbPerIn:-2},point:null});

test('simply supported uniform load has zero end moment and a strict interior qL²/8 peak',()=>{
  const result=recover(input());
  assert.deepEqual(result.sections,[
    {stationIn:0,side:'continuous',axialLb:0,shearLb:-12,momentLbIn:0},
    {stationIn:6,side:'continuous',axialLb:0,shearLb:0,momentLbIn:36},
    {stationIn:12,side:'continuous',axialLb:0,shearLb:12,momentLbIn:0},
  ]);
  assert.deepEqual(result.extrema.momentLbIn.max,result.sections[1]);
  assert.equal(result.manufacturingApproved,false);
});

test('off-center point preserves separate shear/axial limits and continuous moment, for a nonzero fixed moment',()=>{
  const result=recover({lengthIn:12,localEndActions:[-8,15,0,0,5,0],uniform:null,point:{stationIn:3,fxLb:8,fyLb:-20}});
  assert.deepEqual(result.sections,[
    {stationIn:0,side:'continuous',axialLb:8,shearLb:-15,momentLbIn:0},
    {stationIn:3,side:'left',axialLb:8,shearLb:-15,momentLbIn:45},
    {stationIn:3,side:'right',axialLb:0,shearLb:5,momentLbIn:45},
    {stationIn:12,side:'continuous',axialLb:0,shearLb:5,momentLbIn:0},
  ]);
  assert.equal(result.extrema.momentLbIn.max.side,'left');
  const fixed=recover({...input(),localEndActions:[0,12,24,0,12,-24]});
  assert.deepEqual(fixed.sections.map(section=>section.momentLbIn),[-24,12,-24]);
});

test('combined signed loading finds roots in each continuous branch and does not invent a root at the point',()=>{
  const result=recover({lengthIn:12,localEndActions:[0,-2,0,0,-4,12],uniform:{qxLbPerIn:0,qyLbPerIn:1},
    point:{stationIn:6,fxLb:0,fyLb:-6}});
  assert.deepEqual(result.sections.map(({stationIn,side,shearLb,momentLbIn})=>[stationIn,side,shearLb,momentLbIn]),[
    [0,'continuous',2,0],[2,'continuous',0,-2],[6,'left',-4,6],[6,'right',2,6],
    [8,'continuous',0,4],[12,'continuous',-4,12],
  ]);
});

test('fails closed on malformed inputs, right-end imbalance and arithmetic overflow',()=>{
  for (const localEndActions of [[0,12,0,0,12,0.1],[0,12,0,0,11,0],[0,12,0,0.01,12,0]])
    assert.throws(()=>recover({...input(),localEndActions}),/does not close/);
  assert.throws(()=>recover({...input(),localEndActions:[0,,0,0,12,0]}),/six finite/);
  assert.throws(()=>recover({...input(),point:{stationIn:0,fxLb:0,fyLb:-20}}),/strictly interior/);
  assert.throws(()=>recover({...input(),uniform:{qxLbPerIn:0,qyLbPerIn:-2,basis:'horizontal'}}),/exact finite/);
  assert.throws(()=>recover({...input(),uniform:{qxLbPerIn:0,qyLbPerIn:Number.MAX_VALUE}}),/usable numeric range/);
});

test('right-end closure tolerates sub-nanopound roundoff on a nominally free component but no substantive mismatch',()=>{
  const base={lengthIn:12,localEndActions:[-50,0,0,50,2e-13,-1e-13],uniform:null,point:null};
  assert.equal(recover(base).sections[1].momentLbIn,0);
  assert.throws(()=>recover({...base,localEndActions:[-50,0,0,50,1e-5,0]}),/right end/i);
});
