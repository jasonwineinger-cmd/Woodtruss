import test from 'node:test';
import assert from 'node:assert/strict';
import {buildElasticFramePhysicalResultant as build} from '../dist/analysis/src/elastic-frame-physical-resultant.js';
import {solveElasticFrame as solve} from '../dist/analysis/src/elastic-frame-solve.js';

const member={id:'AB',startNodeId:'A',endNodeId:'B',areaIn2:3,secondMomentIn4:20,elasticModulusPsi:1_000_000};
const support={nodeId:'A',fixX:true,fixY:true,fixRotation:true};
const near=(value,want)=>assert.ok(Number.isFinite(value)&&Math.abs(value-want)<1e-7,`${value} vs ${want}`);
const actions={
  loads:[{nodeId:'B',fxLb:4,fyLb:-3,momentLbIn:15}],
  memberLoads:[{memberId:'AB',basis:'horizontal-projection',qxLbPerIn:2,qyLbPerIn:-1}],
  memberPointLoads:[{memberId:'AB',stationIn:25,fxLb:-12,fyLb:8}],
};

test('signed nodal couple, uniform midpoint and directed interior point close independently at two origins',()=>{
  for(const offset of [0,2**42]){
    const frame={nodes:[{id:'A',xIn:offset+150,yIn:offset+20},{id:'B',xIn:offset+90,yIn:offset+100}],
      members:[member],supports:[support]};
    const {reactions}=solve({...frame,...actions});
    const atB=build(frame,actions,reactions,'B');
    assert.equal(atB.originNodeId,'B');
    assert.deepEqual(atB.appliedRows,[
      {kind:'nodal',nodeId:'B',xFromOriginIn:0,yFromOriginIn:0,fxLb:4,fyLb:-3,coupleLbIn:15,momentLbIn:15},
      {kind:'uniform',memberId:'AB',basis:'horizontal-projection',loadedMeasureIn:60,xFromOriginIn:30,
        yFromOriginIn:-40,fxLb:120,fyLb:-60,coupleLbIn:0,momentLbIn:3000},
      {kind:'point',memberId:'AB',stationIn:25,xFromOriginIn:45,yFromOriginIn:-60,fxLb:-12,fyLb:8,
        coupleLbIn:0,momentLbIn:-360},
    ]);
    assert.deepEqual(atB.applied,{fxLb:112,fyLb:-55,momentLbIn:2655});
    near(atB.supportRows[0].coupleLbIn,3005);
    near(atB.supportRows[0].momentLbIn,-2655);
    Object.values(atB.residual).forEach(value=>near(value,0));
    const atA=build(frame,actions,reactions,'A');
    near(atA.applied.momentLbIn,-3005);
    near(atA.support.momentLbIn,3005);
    assert.throws(()=>build(frame,actions,{...reactions,B:{fxLb:1,fyLb:0,momentLbIn:0}},'B'),/away from/);
    assert.throws(()=>build(frame,actions,{...reactions,A:{...reactions.A,momentLbIn:2000}},'B'),/does not close/);
  }
});

test('global equilibrium alone cannot authorize a reaction along a free support tangent',()=>{
  const frame={nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:10,yIn:0}],members:[member],
    supports:[support,{nodeId:'B',freeDx:1,freeDy:0,fixRotation:false}]};
  const actions={loads:[{nodeId:'A',fxLb:0,fyLb:0,momentLbIn:0}]};
  const reactions={A:{fxLb:-10,fyLb:0,momentLbIn:0},B:{fxLb:10,fyLb:0,momentLbIn:0}};
  assert.throws(()=>build(frame,actions,reactions,'A'),/free support tangent/);
});
