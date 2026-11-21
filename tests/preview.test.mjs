import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreliminaryTrussPackage} from '../dist/contracts/src/preview.js';
const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:12,y:0}],bars:[{id:'AB',a:'A',b:'B',areaIn2:1,elasticModulusPsi:1e6}],loads:[],supports:[]};
const envelope={status:'PRELIMINARY_NOT_ENGINEERED',memberForces:{AB:{minLb:0,maxLb:1,governingMinCase:'a',governingMaxCase:'b'}},reactions:{},warnings:[]};
test('integration preview has explicit units and cannot authorize fabrication',()=>{
 const p=createPreliminaryTrussPackage('T1','r1',model,envelope);
 assert.equal(p.fabricationAuthorized,false);
 assert.equal(p.units.length,'in');
 assert.equal(p.schemaVersion,'woodtruss.preview.v1');
 assert.equal(p.status,'PRELIMINARY_NOT_ENGINEERED');
});
test('preview snapshots geometry rather than sharing mutable model arrays',()=>{
 const p=createPreliminaryTrussPackage('T1','r1',model,envelope);
 model.nodes[0].x=999;
 assert.equal(p.geometry.nodes[0].x,0);
 model.nodes[0].x=0;
});
