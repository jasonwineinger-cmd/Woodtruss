import assert from 'node:assert/strict';
import test from 'node:test';
import {registerMeasurementStations as register} from '../dist/geometry/src/measurement-stations.js';

// Independent 3-4-5 frame: along=(.6,.8), signed normal=(-.8,.6).
const point=(station,offset)=>({x:18+.6*station-.8*offset,y:-9+.8*station+.6*offset});
const mark=(id,s,n)=>({id,positionIn:point(s,n)});
const authored={
  originBearingIn: point(0,0), endBearingIn: point(500,0),
  references: [mark('right',400,0),mark('left-upper',100,42),mark('left-lower',100,0)],
  gages: [mark('same-station',100,-18),mark('between',245,8),mark('outside-reference-range',420,0)],
};
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10, String(actual));

test('translated and rotated axes separate station from signed gage offset',()=>{
  const result=register(authored);
  assert.equal(result.spanIn,500);
  assert.deepEqual(result.axis,{x:.6,y:.8});
  assert.deepEqual(result.normal,{x:-.8,y:.6});
  for(const [i,s,n] of [[0,100,-18],[1,245,8],[2,420,0]]){
    close(result.gages[i].stationIn,s);
    close(result.gages[i].signedOffsetIn,n);
  }
  assert.deepEqual(result.gages[0].association,{
    kind:'same-longitudinal-station-only',referenceIds:['left-lower','left-upper'],
  });
  assert.deepEqual(result.gages[1].association,{
    kind:'strictly-bracketed-only',beforeIds:['left-lower','left-upper'],afterIds:['right'],
  });
  assert.deepEqual(result.gages[2].association,{kind:'unbracketed'});
  assert.equal(result.jointEquivalenceEstablished,false);
  assert.equal(result.displacementPredicted,false);
  assert.equal(result.fabricationAuthorized,false);
});

test('explicitly reversing bearings reverses stations and signed offsets',()=>{
  const result=register({...authored,originBearingIn:authored.endBearingIn,endBearingIn:authored.originBearingIn});
  close(result.gages[1].stationIn,255);
  close(result.gages[1].signedOffsetIn,-8);
  assert.deepEqual(result.gages[1].association,{
    kind:'strictly-bracketed-only',beforeIds:['right'],afterIds:['left-lower','left-upper'],
  });
});

test('600 inch span and endpoints accepted, malformed or outside inputs rejected',()=>{
  const model={originBearingIn:{x:0,y:0},endBearingIn:{x:600,y:0},references:[],
    gages:[{id:'end',positionIn:{x:600,y:15}}]};
  assert.equal(register(model).gages[0].stationIn,600);
  for(const changed of [
    {endBearingIn:{x:600.001,y:0}}, {endBearingIn:{x:0,y:0}},
    {gages:[{id:'beyond',positionIn:{x:601,y:0}}]},
    {gages:[{id:'bad',positionIn:{x:0,y:Infinity}}]},
    {gages:[model.gages[0],model.gages[0]]},
  ]) assert.throws(()=>register({...model,...changed}),RangeError);
});
