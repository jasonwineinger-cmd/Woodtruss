import assert from 'node:assert/strict';
import test from 'node:test';
import {generateDoubleFinkTopology as generate} from '../dist/geometry/src/double-fink-topology.js';

const sample={family:'common',spanFt:32,pitchRisePer12:5};
const key=(u,v)=>[u,v].sort().join(':');
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);

test('generic triangulated double-Fink reference tiles a symmetric roof with no crossing bars',()=>{
 const g=generate(sample);
 assert.equal(g.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
 assert.equal(g.pinJointAnalysisAvailable,false);
 assert.equal(g.fabricationAuthorized,false);
 assert.deepEqual(g.bearings,{left:'L',right:'E'});
 const points=new Map(g.joints.map(j=>[j.id,j.position]));
 assert.equal(points.size,16);
 assert.deepEqual(points.get('L'),{x:0,y:0});
 assert.deepEqual(points.get('E'),{x:384,y:0});
 for(let i=1;i<8;i++){
   assert.deepEqual(points.get(`T${i}`),{x:i*48,y:Math.min(i,8-i)*20});
   assert.deepEqual(points.get(`B${i}`),{x:i*48,y:0});
 }
 const edges=new Set();
 for(const {start,end} of g.members){
   assert.ok(points.has(start)&&points.has(end));
   assert.notDeepEqual(points.get(start),points.get(end));
   assert.ok(!edges.has(key(start,end)));
   edges.add(key(start,end));
 }
 assert.equal(edges.size,29);
 const mirror=(id)=>id==='L'?'E':id==='E'?'L':id[0]+(8-Number(id[1]));
 for(const {start,end} of g.members)assert.ok(edges.has(key(mirror(start),mirror(end))));
 const left=[
   ['L','T1','B1'],['T1','B1','B2'],['T1','B2','T2'],['T2','B2','B3'],
   ['T2','B3','B4'],['T2','B4','T3'],['T3','B4','T4'],
 ];
 const triangles=[...left,...left.map(t=>t.map(mirror))];
 let doubleArea=0;
 const incidence=new Map();
 for (const [a,b,c] of triangles) {
   const area=Math.abs(cross(points.get(a),points.get(b),points.get(c)));
   assert.ok(area>0);
   doubleArea+=area;
   for(const e of [key(a,b),key(b,c),key(c,a)]){
     assert.ok(edges.has(e));
     incidence.set(e,(incidence.get(e)??0)+1);
   }
 }
 assert.equal(doubleArea,384*80);
 assert.equal(incidence.size,29);
 assert.equal([...incidence.values()].filter(n=>n===1).length,16);
 assert.equal([...incidence.values()].filter(n=>n===2).length,13);
 // Without a shared endpoint, no edge pair may cross or touch, including
 // collinear overlap or running a bar through an unrelated existing joint.
 const between=(p,q,r)=>Math.min(p.x,q.x)<=r.x&&r.x<=Math.max(p.x,q.x)
     &&Math.min(p.y,q.y)<=r.y&&r.y<=Math.max(p.y,q.y);
 for(let i=0;i<g.members.length;i++)for(let j=i+1;j<g.members.length;j++){
   const {start:a,end:b}=g.members[i],{start:c,end:d}=g.members[j];
   if([a,b].some(id=>id===c||id===d))continue;
   const [p,q,r,s]=[a,b,c,d].map(id=>points.get(id));
   const x=cross(p,q,r),y=cross(p,q,s),z=cross(r,s,p),w=cross(r,s,q);
   assert.ok(!(x*y<0 && z*w<0));
   assert.ok(!(x===0&&between(p,q,r) || y===0&&between(p,q,s)
       || z===0&&between(r,s,p) || w===0&&between(r,s,q)));
 }
});

test('keeps the 8–50-foot range and rejects unmodeled or numerically degenerate options',()=>{
 for(const spanFt of [8,50])assert.equal(generate({...sample,spanFt}).joints.find(j=>j.id==='E').position.x,spanFt*12);
 for(const bad of [
   {spanFt:7.999},{spanFt:50.001},{spanFt:Infinity},{family:'scissor'},
   {overhangIn:1},{heelHeightIn:1},{bottomPitchRisePer12:1},
   {pitchRisePer12:0},{pitchRisePer12:18.001},{pitchRisePer12:Number.MIN_VALUE},
 ])assert.throws(()=>generate({...sample,...bad}));
});
