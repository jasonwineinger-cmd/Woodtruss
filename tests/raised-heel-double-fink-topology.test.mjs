import assert from 'node:assert/strict';
import test from 'node:test';
import {generateRaisedHeelDoubleFinkTopology as generate} from '../dist/geometry/src/raised-heel-double-fink-topology.js';

const input={family:'common',spanFt:32,pitchRisePer12:5,heelHeightIn:12};
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const key=(a,b)=>[a,b].sort().join(':');

test('raised heel double-Fink reference preserves pitch, planarity and an independently tiled profile',()=>{
 const g=generate(input);
 assert.equal(g.pinJointAnalysisAvailable,false);
 assert.equal(g.fabricationAuthorized,false);
 assert.equal(g.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
 const nodes=new Map(g.joints.map(j=>[j.id,j.position]));
 assert.equal(nodes.size,18);
 assert.equal(g.joints.length,18);
 assert.deepEqual(g.bearings,{left:'L',right:'E'});
 assert.deepEqual(g.topHeels,{left:'HL',right:'HE'});
 assert.deepEqual(nodes.get('L'),{x:0,y:0});
 assert.deepEqual(nodes.get('E'),{x:384,y:0});
 assert.deepEqual(nodes.get('HL'),{x:0,y:12});
 assert.deepEqual(nodes.get('HE'),{x:384,y:12});
 for(let i=1;i<8;i++){
   assert.deepEqual(nodes.get(`B${i}`),{x:48*i,y:0});
   assert.deepEqual(nodes.get(`T${i}`),{x:48*i,y:12+20*Math.min(i,8-i)});
 }
 const edges=new Set(g.members.map(m=>{
   assert.ok(nodes.has(m.start)&&nodes.has(m.end));
   assert.notDeepEqual(nodes.get(m.start),nodes.get(m.end));
   return key(m.start,m.end);
 }));
 assert.equal(g.members.length,33);
 assert.equal(edges.size,33);

 const mirror=(id)=>({L:'E',E:'L',HL:'HE',HE:'HL'})[id]??id[0]+(8-Number(id[1]));
 const left=[
   ['L','HL','B1'],['HL','T1','B1'],['T1','B1','B2'],['T1','B2','T2'],
   ['T2','B2','B3'],['T2','B3','B4'],['T2','B4','T3'],['T3','B4','T4'],
 ];
 const counts=new Map();
 let totalArea=0;
 for(const [a,b,c] of [...left,...left.map(t=>t.map(mirror))]){
   const area=Math.abs(cross(nodes.get(a),nodes.get(b),nodes.get(c)))/2;
   assert.ok(area>0);
   totalArea+=area;
   for(const e of [key(a,b),key(b,c),key(c,a)]){
     assert.ok(edges.has(e)); counts.set(e,(counts.get(e)??0)+1);
   }
 }
 assert.equal(counts.size,33);
 assert.equal([...counts.values()].filter(n=>n===1).length,18);
 assert.equal([...counts.values()].filter(n=>n===2).length,15);
 assert.equal(totalArea,384*12+384*80/2);
 const between=(p,q,r)=>Math.min(p.x,q.x)<=r.x && r.x<=Math.max(p.x,q.x) &&
   Math.min(p.y,q.y)<=r.y && r.y<=Math.max(p.y,q.y);
 for(let i=0;i<g.members.length;i++)for(let j=i+1;j<g.members.length;j++){
   const {start:a,end:b}=g.members[i],{start:c,end:d}=g.members[j];
   if([a,b].some(id=>id===c||id===d))continue;
   const [p,q,r,s]=[a,b,c,d].map(id=>nodes.get(id));
   const x=cross(p,q,r),y=cross(p,q,s),z=cross(r,s,p),w=cross(r,s,q);
   assert.ok(!(x*y<0&&z*w<0));
   assert.ok(!(x===0&&between(p,q,r)||y===0&&between(p,q,s)||
               z===0&&between(r,s,p)||w===0&&between(r,s,q)));
 }
});

test('inherits common-only 8–50-foot geometry and fails outside supported offsets',()=>{
 for(const spanFt of [8,50])assert.equal(generate({...input,spanFt}).joints.find(j=>j.id==='HE').position.x,spanFt*12);
 for(const edit of [{spanFt:50.001},{spanFt:7.999},{family:'mono'},{pitchRisePer12:0},
                    {heelHeightIn:0},{heelHeightIn:48.001},{overhangIn:1},{bottomPitchRisePer12:2}])
   assert.throws(()=>generate({...input,...edit}));
});
