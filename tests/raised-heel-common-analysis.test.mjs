import assert from 'node:assert/strict';
import test from 'node:test';
import {analyzePreliminaryRaisedHeelCommonTruss as analyze} from '../dist/analysis/src/raised-heel-common-analysis.js';

const input={
  roof:{family:'common',spanFt:32,pitchRisePer12:6,heelHeightIn:12},
  areaIn2:5.25,elasticModulusPsi:1_000_000,
  loadCase:{id:'idealized-heel',description:'Signed horizontal and vertical point load illustration',
    jointLoads:[{nodeId:'HL',fxLb:100},{nodeId:'Q1',fyLb:-900},{nodeId:'Q3',fyLb:200}]},
};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('triangulated idealized graph reproduces independent reactions including the raised heel moment arm',()=>{
  const a=analyze(input);
  assert.equal(a.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(a.fabricationAuthorized,false);
  assert.deepEqual(a.referenceTopHeels,{left:'HL',right:'HE'});
  assert.deepEqual(a.model.supports,[{nodeId:'L',fixX:true,fixY:true},{nodeId:'E',fixX:false,fixY:true}]);
  const points=new Map(a.model.nodes.map(n=>[n.id,n]));
  const key=(a,b)=>[a,b].sort().join(':');
  const bars=new Set(a.model.bars.map(({a,b})=>key(a,b)));
  // Add one distinct joint at a time to a rigid seed triangle via two bars
  // and distinct, noncollinear fixed-in-the-graph anchor nodes.
  const triangles=[
    ['L','HL','B1'],['HL','B1','Q1'],['B1','Q1','B2'],['Q1','B2','R'],
    ['R','B2','Q3'],['Q3','B2','B3'],['B3','Q3','HE'],['B3','HE','E'],
  ];
  const vertices=new Set();
  const checked=new Set();
  for(const [i,[x,y,z]] of triangles.entries()){
    if(i) { assert.ok(vertices.has(x)&&vertices.has(y)); assert.ok(!vertices.has(z)); }
    const [u,v,w]=[x,y,z].map(id=>points.get(id));
    assert.notEqual((v.x-u.x)*(w.y-u.y)-(v.y-u.y)*(w.x-u.x),0);
    for(const [p,q] of [[x,y],[y,z],[z,x]]){assert.ok(bars.has(key(p,q)));checked.add(key(p,q));}
    for(const id of [x,y,z])vertices.add(id);
  }
  assert.equal(vertices.size,10);
  assert.equal(checked.size,17);
  assert.deepEqual(checked,bars);
  // R_E*384 = 900*96 − 200*288 + 100*12, with 12 the distinct HL height.
  const {L,E}=a.result.reactionLb;
  near(E.y,30000/384);
  near(L.y,700-30000/384);
  near(L.x,-100);
  near(E.x,0);
  assert.ok(a.equilibrium.global.passes&&a.equilibrium.joints.passes);
  assert.ok(Object.values(a.result.axialForceLb).every(Number.isFinite));
});

test('fails closed beyond 50 feet or on unmodeled geometries and invalid signed forces',()=>{
  const solve=(roof)=>analyze({...input,roof:{...input.roof,...roof}});
  assert.equal(solve({spanFt:50,heelHeightIn:48}).model.nodes.find(n=>n.id==='HE').x,600);
  for(const invalid of [
    {spanFt:50.001},{spanFt:51},{heelHeightIn:0},{overhangIn:1},{bottomPitchRisePer12:2},
  ])assert.throws(()=>solve(invalid));
  for(const invalid of [{nodeId:'fake',fyLb:1},{nodeId:'HL',fxLb:NaN}]){
    assert.throws(()=>analyze({...input,loadCase:{...input.loadCase,jointLoads:[invalid]}}),/explicit joint load/);
  }
  assert.throws(()=>analyze({...input,areaIn2:0}),/positive finite/);
});
