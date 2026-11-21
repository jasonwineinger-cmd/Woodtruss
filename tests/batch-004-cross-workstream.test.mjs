import assert from 'node:assert/strict';
import test from 'node:test';
import {generateAtticRoomTopology} from '../dist/geometry/src/attic-topology.js';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {createPreliminaryMaterialsTraceabilityManifest,fingerprintPreliminaryMaterialsSource} from '../dist/fabrication/src/preliminary-materials-traceability.js';
import {createPreliminaryMaterialsChangeCatalog,verifyPreliminaryMaterialsChangeCatalog} from '../dist/fabrication/src/preliminary-materials-change-catalog.js';

test('attic room revisions can be compared without turning schematic geometry into a structural or fabrication result',async()=>{
  const designId='synthetic-attic';
  async function stage(roomWidthFt,revisionId){
    const topology=generateAtticRoomTopology({family:'attic',spanFt:40,pitchRisePer12:8,
      roomWidthFt,requiredClearHeightFt:7});
    assert.equal(topology.pinJointAnalysisAvailable,false);
    assert.equal(topology.fabricationAuthorized,false);
    const geometry={nodes:topology.joints.map(({id,position})=>({id,...position})),
      bars:topology.members.map(({id,start:a,end:b})=>({id,a,b}))};
    const snapshot=createPreliminaryMaterialsReport(designId,revisionId,geometry);
    const expected={designId,revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(geometry)};
    return {snapshot,expected,manifest:await createPreliminaryMaterialsTraceabilityManifest(snapshot)};
  }
  const from=await stage(12,'R1'),to=await stage(13,'R2');
  const catalog=await createPreliminaryMaterialsChangeCatalog(from,to);
  assert.notEqual(catalog.from.sourceGeometrySha256,catalog.to.sourceGeometrySha256);
  assert.ok(catalog.joints.changedIds.length>0 && catalog.members.changedIds.length>0);
  assert.equal(catalog.notice,'NOT FOR FABRICATION');
  assert.equal(catalog.fabricationAuthorized,false);
  await assert.rejects(verifyPreliminaryMaterialsChangeCatalog({...catalog,unresolved:[]},from,to),/bound preliminary revision/);
});
