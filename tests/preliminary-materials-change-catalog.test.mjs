import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {createPreliminaryMaterialsTraceabilityManifest,fingerprintPreliminaryMaterialsSource} from '../dist/fabrication/src/preliminary-materials-traceability.js';
import {createPreliminaryMaterialsChangeCatalog,verifyPreliminaryMaterialsChangeCatalog} from '../dist/fabrication/src/preliminary-materials-change-catalog.js';

const model=y=>({nodes:[{id:'A',x:0,y:0},{id:'B',x:3,y}],bars:[{id:'AB',a:'A',b:'B'}]});
const clone=x=>JSON.parse(JSON.stringify(x));
async function evidence(revisionId,y,designId='design') {
  const geometry=model(y);
  const expected={designId,revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(geometry)};
  const snapshot=clone(createPreliminaryMaterialsReport(designId,revisionId,geometry));
  return {expected,snapshot,manifest:clone(await createPreliminaryMaterialsTraceabilityManifest(snapshot))};
}

test('replays directional, source-bound catalog and marks unchanged-length relocation',async()=>{
  const from=await evidence('r1',4),to=await evidence('r2',-4);
  const catalog=await createPreliminaryMaterialsChangeCatalog(from,to);
  assert.equal(catalog.schemaVersion,'woodtruss.preliminary-materials-change-catalog.v1');
  assert.equal(catalog.fabricationAuthorized,false);
  assert.equal(catalog.notice,'NOT FOR FABRICATION');
  assert.deepEqual(catalog.from,{revisionId:'r1',sourceGeometrySha256:from.expected.sourceGeometrySha256});
  assert.deepEqual(catalog.to,{revisionId:'r2',sourceGeometrySha256:to.expected.sourceGeometrySha256});
  assert.deepEqual(catalog.joints.changedIds,['B']);
  assert.deepEqual(catalog.members.changedIds,['AB']);
  assert.deepEqual(await verifyPreliminaryMaterialsChangeCatalog(clone(catalog),from,to),catalog);
  await assert.rejects(verifyPreliminaryMaterialsChangeCatalog(clone(catalog),to,from),/bound preliminary revision/);
});

test('rejects newer, stale, and forged review claims, including held tiers removed from a no-change catalog',async()=>{
  const from=await evidence('r1',4),to=await evidence('r2',4);
  const catalog=await createPreliminaryMaterialsChangeCatalog(from,to);
  assert.deepEqual(catalog.members.changedIds,[]);
  assert.deepEqual(catalog.unresolved,['MEMBER_CAPACITY','CONNECTIONS_AND_BEARING','FABRICATION_AND_MACHINE_OUTPUT']);
  const forged=[
    {...catalog,schemaVersion:'woodtruss.preliminary-materials-change-catalog.v2'},
    {...catalog,fabricationAuthorized:true}, {...catalog,unresolved:[]},
    {...catalog,notice:'APPROVED'}, {...catalog,cutList:[]},
    {...catalog,to:{...catalog.to,revisionId:'r0'}},
    {...catalog,members:{...catalog.members,removedIds:['AB']}},
  ];
  for(const candidate of forged) await assert.rejects(verifyPreliminaryMaterialsChangeCatalog(candidate,from,to),/bound preliminary revision/);
  const getter={...catalog};
  Object.defineProperty(getter,'notice',{get(){throw new Error('must not invoke accessor');}});
  await assert.rejects(verifyPreliminaryMaterialsChangeCatalog(getter,from,to),/bound preliminary revision/);
});

test('rejects self-consistent replacement evidence, reused revision IDs and cross-design comparisons',async()=>{
  const from=await evidence('r1',4),to=await evidence('r2',4),substituted=await evidence('r2',-4);
  await assert.rejects(createPreliminaryMaterialsChangeCatalog(from,{...substituted,expected:to.expected}),/source geometry/);
  await assert.rejects(createPreliminaryMaterialsChangeCatalog(from,from),/Distinct revision/);
  await assert.rejects(createPreliminaryMaterialsChangeCatalog(from,await evidence('r2',4,'other')),/different designs/);
});
