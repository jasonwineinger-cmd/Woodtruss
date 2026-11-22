import test from 'node:test';
import assert from 'node:assert/strict';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const L = 110, a = 38;
const qx = 1.2, qy = -1.8, fx = -25, fy = 95;
const model = {
  nodes: [{ id: 'A', xIn: 0, yIn: 0 }, { id: 'B', xIn: L, yIn: 0 }],
  members: [{ id: 'beam', startNodeId: 'A', endNodeId: 'B', areaIn2: 4,
    secondMomentIn4: 29, elasticModulusPsi: 1400000 }],
  supports: [{ nodeId: 'A', fixX: true, fixY: true, fixRotation: true }],
  loads: [],
  memberLoads: [{ memberId: 'beam', basis: 'member-length', qxLbPerIn: qx, qyLbPerIn: qy }],
  memberPointLoads: [{ memberId: 'beam', stationIn: a, fxLb: fx, fyLb: fy }],
};
const solveCuts = cuts => solveElasticFrame({ ...model, memberSectionCuts: [{ memberId: 'beam', cuts }] });
const near = (actual, expected, label) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-7,
    `${label}: expected ${expected}, got ${actual}`);

test('requested cantilever cuts match independent right-segment equilibrium without changing extrema', () => {
  const cuts = [
    { stationIn: 13, side: 'continuous' },
    { stationIn: a, side: 'left' },
    { stationIn: a, side: 'right' },
    { stationIn: 79, side: 'continuous' },
  ];
  const baseline = solveElasticFrame(model).memberSectionDemand.beam;
  const demand = solveCuts(cuts).memberSectionDemand.beam;
  assert.equal(demand.requestedCuts.length, cuts.length);
  for (const [i, { stationIn: x, side }] of cuts.entries()) {
    const observed = demand.requestedCuts[i];
    assert.equal(observed.stationIn, x);
    assert.equal(observed.side, side);
    // Cut away the left side. The force and moment acting on left material
    // are, by equilibrium and action/reaction, the external resultants of
    // the retained right segment. The right side of the point excludes it.
    const span = L - x;
    const includePoint = x < a || (x === a && side === 'left');
    near(observed.axialLb, qx * span + (includePoint ? fx : 0), `axial at ${x} ${side}`);
    near(observed.shearLb, qy * span + (includePoint ? fy : 0), `shear at ${x} ${side}`);
    near(observed.momentLbIn, qy * span ** 2 / 2 + (includePoint ? fy * (a - x) : 0),
      `moment at ${x} ${side}`);
  }
  assert.deepEqual(demand.extrema, baseline.extrema);
  assert.deepEqual(demand.sections, baseline.sections);
});

test('requested cuts require an explicit side at an action jump and continuous side elsewhere', () => {
  for (const [stationIn, side] of [[a, 'continuous'], [a - 1, 'left'], [a + 1, 'right']]) {
    assert.throws(() => solveCuts([{ stationIn, side }]), /cut|side|continuous|station/i);
  }
});

test('section requests bind to the exact directed member and never borrow another member’s point side',()=>{
  const row={memberId:'beam',cuts:[{stationIn:a,side:'right'}]};
  const second={...model,nodes:[...model.nodes,{id:'C',xIn:2*L,yIn:0}],
    members:[...model.members,{...model.members[0],id:'beam2',startNodeId:'B',endNodeId:'C'}]};
  const both=solveElasticFrame({...second,memberSectionCuts:[row,
    {memberId:'beam2',cuts:[{stationIn:a,side:'continuous'}]}]});
  assert.equal(both.memberSectionDemand.beam.requestedCuts[0].side,'right');
  assert.equal(both.memberSectionDemand.beam2.requestedCuts[0].side,'continuous');
  assert.equal(both.memberSectionDemand.beam2.requestedCuts[0].axialLb,0);
  assert.throws(()=>solveElasticFrame({...second,memberSectionCuts:[{...row,memberId:'beam2'}]}),/side|continuous/i);
  for(const invalid of [undefined,[],[row,row],[{...row,memberId:'B'}],
    [{...row,cuts:[]}],[{...row,caseId:'another-solve'}],[,row]]) {
    assert.throws(()=>solveElasticFrame({...second,memberSectionCuts:invalid}),/section cut/i);
  }
  assert.deepEqual(solveElasticFrame(second).memberSectionDemand.beam.requestedCuts,[]);
  assert.equal(both.fabricationAuthorized,false);
});
