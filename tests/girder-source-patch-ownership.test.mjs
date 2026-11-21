import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePinJointedTruss} from '../dist/analysis/src/index.js';
import {aggregateOwnedGirderSourcePatches} from '../dist/analysis/src/girder-source-patch-ownership.js';

const model={nodes:[{id:'A',x:10,y:0},{id:'B',x:58,y:24},{id:'C',x:154,y:0}],
 bars:[['A','B'],['B','C'],['A','C']].map(([a,b])=>({id:a+b,a,b,areaIn2:2,elasticModulusPsi:1e6})),
 supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]};
const base={caseId:'synthetic',girderId:'G1',stationIn:48,nodeId:'B',face:'authored-near-face'};
const direct={...base,patchId:'roof-direct',route:{kind:'direct'}};
const carried={...base,patchId:'supported-truss-area',route:{kind:'carried',carriedSupportId:'carried-T1-A'}};
const expected={caseId:base.caseId,girderId:base.girderId,stationOriginXIn:10,patches:[direct,carried]};
const solvedReactions=(loads)=>{
 const result=analyzePinJointedTruss({...model,loads});
 return [result.reactionLb.A.y,result.reactionLb.C.y];
};
const close=(actual,wanted)=>actual.forEach((value,i)=>assert.ok(Math.abs(value-wanted[i])<1e-8));
const receipt=(patch,fyLb=-60)=>({...patch,fyLb,provenance:'synthetic author note'});

test('distinct direct and carried patches remain attributable and yield independent 80/40 reactions',()=>{
 const out=aggregateOwnedGirderSourcePatches(model,expected,[receipt(carried),receipt(direct)]);
 assert.deepEqual(out.patchReceipts,[receipt(direct),receipt(carried)]);
 assert.deepEqual(out.jointLoads,[{nodeId:'B',fyLb:-120,fxLb:0}]);
 assert.equal(out.patchAreaVerified,false);
 assert.equal(out.carriedReactionVerified,false);
 assert.equal(out.manufacturingApproved,false);
 const total=-out.jointLoads[0].fyLb;
 const right=total*base.stationIn/144;
 assert.deepEqual([total-right,right],[80,40]);
 close(solvedReactions(out.jointLoads),[80,40]);
});

test('rejects a copied source patch across direct and carried routes even though gross equilibrium would balance',()=>{
 const duplicate=receipt({...direct,route:carried.route});
 close(solvedReactions([{nodeId:"B",fyLb:-180}]),[120,60]);
 assert.throws(()=>aggregateOwnedGirderSourcePatches(model,expected,[receipt(direct),receipt(carried),duplicate]),/Duplicate source patch/);
 assert.throws(()=>aggregateOwnedGirderSourcePatches(model,{...expected,patches:[direct,{...carried,patchId:direct.patchId}]},
   [receipt(direct),duplicate]),/Duplicate expected/);
});

test('fails before aggregation on station, face, carried support, case or missing evidence',()=>{
 for(const edit of [{stationIn:49},{nodeId:'C'},{face:'other-face'},
    {route:{kind:'carried',carriedSupportId:'other-support'}},{route:{kind:'direct'}}])
   assert.throws(()=>aggregateOwnedGirderSourcePatches(model,expected,[receipt(direct),receipt({...carried,...edit})]),/expected ownership/);
 assert.throws(()=>aggregateOwnedGirderSourcePatches(model,expected,[receipt(direct),receipt({...carried,caseId:'other'})]),/wrong-scope/);
 assert.throws(()=>aggregateOwnedGirderSourcePatches(model,expected,[receipt(direct)]),/Missing independently expected/);
 assert.throws(()=>aggregateOwnedGirderSourcePatches(model,{...expected,stationOriginXIn:0},[receipt(direct),receipt(carried)]),/modeled joint/);
 assert.throws(()=>aggregateOwnedGirderSourcePatches(model,expected,[receipt(direct),receipt(carried,NaN)]),/Invalid signed/);
});
