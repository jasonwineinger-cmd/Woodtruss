import test from 'node:test';
import assert from 'node:assert/strict';
import {solveElasticFrame} from '../dist/analysis/src/elastic-frame-solve.js';

const L=100,a=31,cos=-.6,sin=.8;
const tipN=-17,tipV=36,tipM=-120;
const pointN=62,pointV=-41;
const global=(axial,transverse)=>({fxLb:cos*axial-sin*transverse,fyLb:sin*axial+cos*transverse});
const near=(actual,expected,label)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<1e-8,
  `${label}: ${actual} vs ${expected}`);
const model={
  nodes:[{id:'A',xIn:140,yIn:12},{id:'B',xIn:80,yIn:92}],
  members:[{id:'AB',startNodeId:'A',endNodeId:'B',elasticModulusPsi:1_100_000,areaIn2:3,secondMomentIn4:22}],
  supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:true}],
  loads:[{nodeId:'B',...global(tipN,tipV),momentLbIn:tipM}],
};
const forwardCuts=[
  {stationIn:0,side:'continuous'},
  {stationIn:11,side:'continuous'},
  {stationIn:a,side:'left'},
  {stationIn:a,side:'right'},
  {stationIn:63,side:'continuous'},
  {stationIn:L,side:'continuous'},
];
const flip=({stationIn,side})=>({stationIn:L-stationIn,side:side==='left'?'right':side==='right'?'left':'continuous'});
const solve=(reversed,cuts)=>solveElasticFrame({
  ...model,
  members:reversed?[{...model.members[0],startNodeId:'B',endNodeId:'A'}]:model.members,
  memberPointLoads:[{memberId:'AB',stationIn:reversed?L-a:a,...global(pointN,pointV)}],
  memberSectionCuts:[{memberId:'AB',cuts}],
});

test('inclined requested section cuts follow physical stations and opposite point limits when ordered axis reverses',()=>{
  const backwardsCuts=forwardCuts.map(flip).reverse();
  const forward=solve(false,forwardCuts), backward=solve(true,backwardsCuts);
  const first=forward.memberSectionDemand.AB.requestedCuts;
  const second=backward.memberSectionDemand.AB.requestedCuts;
  const keys=rows=>rows.map(({stationIn,side})=>({stationIn,side}));
  assert.deepEqual(keys(first),forwardCuts);
  assert.deepEqual(keys(second),backwardsCuts);
  forwardCuts.forEach((cut,i)=>{
    const {stationIn:x,side}=cut;
    const include=x<a||(x===a&&side==='left');
    // Global loads were chosen to have these exact projected components.
    // On the right physical body, net demand equals its external force and
    // its external moment about the cut (point load has zero arm at the jump).
    const N=tipN+(include?pointN:0);
    const V=tipV+(include?pointV:0);
    const M=tipM+(L-x)*tipV+(include?(a-x)*pointV:0);
    near(first[i].axialLb,N,`forward axial ${x}, ${side}`);
    near(first[i].shearLb,V,`forward shear ${x}, ${side}`);
    near(first[i].momentLbIn,M,`forward moment ${x}, ${side}`);
    // Flipping arrow reverses both local translational axes and exchanges
    // section faces. Force component signs cancel in pairs; CCW axis remains
    // the same, so exchanging faces reverses moment alone.
    const reversed=flip(cut);
    const other=second.find(row=>row.stationIn===reversed.stationIn&&row.side===reversed.side);
    assert.ok(other,`missing reversed cut for ${x}, ${side}`);
    near(other.axialLb,N,`reverse axial ${x}, ${side}`);
    near(other.shearLb,V,`reverse shear ${x}, ${side}`);
    near(other.momentLbIn,-M,`reverse moment ${x}, ${side}`);
  });
  assert.equal(forward.fabricationAuthorized,false);
  assert.equal(backward.fabricationAuthorized,false);
});
