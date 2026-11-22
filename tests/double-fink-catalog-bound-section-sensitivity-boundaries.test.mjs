import test from 'node:test';
import assert from 'node:assert/strict';
import { pairedFixture } from './helpers/double-fink-sensitivity-fixture.mjs';
import { reviewDoubleFinkCatalogBoundSectionSensitivity as review } from '../dist/lumber/src/double-fink-catalog-bound-section-sensitivity.js';

function held(input) {
  const result = review(input);
  assert.equal(result.status, 'HOLD_DOUBLE_FINK_CATALOG_BOUND_SECTION_SENSITIVITY');
  assert.deepEqual(result.cases, []);
  assert.deepEqual(result.changedUnselectedMembers, []);
  assert.equal(result.fabricationAuthorized, false);
  assert.equal(result.machineReleaseAuthorized, false);
  assert.equal(result.shippingAuthorized, false);
}
test('paired sensitivity holds stale exact receipts and unchanged or reused revisions', () => {
  const stale = pairedFixture();
  stale.alternative.receipts = stale.baseline.receipts;
  held(stale);
  const identical = pairedFixture();
  identical.alternative.study.memberAssignments = identical.baseline.study.memberAssignments;
  held(identical);
  const sameRevision = pairedFixture();
  sameRevision.alternative.study.modelRevision = sameRevision.baseline.study.modelRevision;
  held(sameRevision);
});
test('paired sensitivity cannot attribute loads, releases or different stations to stiffness', () => {
  const input = pairedFixture();
  input.alternative.study.sources[0].loads[0].fxLb += 1;
  held(input);
  const restraint = pairedFixture();
  restraint.alternative.study.supports[1].fixX = false;
  held(restraint);
  const release = pairedFixture();
  release.alternative.study.memberAssignments[0].releaseStartRotation = false;
  held(release);
  const cut = pairedFixture();
  cut.alternative.study.caseCuts[0].memberCuts[0].cuts[0].stationIn += 1;
  held(cut);
});
test('paired sensitivity rejects cached/different metadata and does not invoke accessors', () => {
  held({ baseline: { cases: [] }, alternative: { cases: [] } });
  const pair = pairedFixture();
  pair.alternative.receipts[0].sourceArtifactId += '-other';
  pair.alternative.expectedSources[0].sourceArtifactId += '-other';
  held(pair);
  let read = false;
  const trapped = pairedFixture();
  const answer = trapped.alternative;
  Object.defineProperty(trapped, 'alternative', { enumerable: true, get() { read = true; return answer; } });
  held(trapped);
  assert.equal(read, false);
});
test('one selected-property change or one unsupported side withholds the whole comparison', () => {
  const input = pairedFixture();
  input.alternative.study.memberAssignments.find(row => row.memberId === 'bottom-B1-B2').areaIn2 += 1;
  held(input);
  const unsupported = pairedFixture();
  unsupported.baseline.study.memberAssignments.find(row => row.memberId === 'bottom-L-B1').elasticModulusPsi = 0;
  held(unsupported);
  const tooWide = pairedFixture();
  tooWide.baseline.study.roof.spanFt = tooWide.alternative.study.roof.spanFt = 50.0001;
  held(tooWide);
});
