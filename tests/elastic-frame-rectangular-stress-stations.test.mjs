import test from 'node:test';
import assert from 'node:assert/strict';
import {elasticFrameRectangularStressStations as stations} from '../dist/analysis/src/elastic-frame-rectangular-stress-stations.js';

const trace=(rows,expected)=>{
  assert.equal(rows.length,expected.length);
  rows.forEach((row,i)=>{
    assert.ok(Math.abs(row.stationIn-expected[i][0])<1e-12,`${row.stationIn} vs ${expected[i][0]}`);
    assert.equal(row.side,expected[i][1]);
  });
};
const C='continuous';
test('returns both rectangular-face critical stations, not only the moment extremum',()=>{
  // V=-20+4x; -N'=qx=6 and S/A=12/6=2. Each stress changes
  // slope at one of V=-12/+12, i.e. at 2/8 in (not the M-only root of 5).
  const demand={lengthIn:10,localEndActions:[0,20,0,-60,20,0],
    uniform:{qxLbPerIn:6,qyLbPerIn:-4},point:null};
  trace(stations(demand,12),[[0,C],[2,C],[8,C],[10,C]]);
  trace(stations({...demand,uniform:{qxLbPerIn:0,qyLbPerIn:-4},localEndActions:[0,20,0,0,20,0]},12),
    [[0,C],[5,C],[10,C]]);
});

test('partitions point jumps and retains strict interior roots on their own sides',()=>{
  // V=-12+3x before 6 and V=-24+3x after. With thresholds ±3,
  // roots at 3/5 before and 7/9 after; no root is assumed across the jump.
  const demand={lengthIn:12,localEndActions:[0,12,0,-36,12,0],
    uniform:{qxLbPerIn:3,qyLbPerIn:-3},point:{stationIn:6,fxLb:0,fyLb:12}};
  trace(stations(demand,6),[[0,C],[3,C],[5,C],[6,'left'],[6,'right'],[7,C],[9,C],[12,C]]);
  // Threshold ±6 matches the two jump limits exactly, not extra stations.
  trace(stations(demand,12),[[0,C],[2,C],[6,'left'],[6,'right'],[10,C],[12,C]]);
});

test('constant shear and face plateaus contribute boundary cuts only; invalid provenance is rejected',()=>{
  const demand={lengthIn:10,localEndActions:[0,2,0,-20,-2,20],
    uniform:{qxLbPerIn:2,qyLbPerIn:0},point:null};
  trace(stations(demand,6),[[0,C],[10,C]]);
  assert.throws(()=>stations(demand,Infinity),/depth/);
  assert.throws(()=>stations({...demand,localEndActions:[0,2,0,-20,2,20]},6),/does not close/);
});

test('holds when distinct signed face roots collapse to one representable station',()=>{
  const demand={lengthIn:10,localEndActions:[0,20,0,-1e-15,20,0],
    uniform:{qxLbPerIn:1e-16,qyLbPerIn:-4},point:null};
  assert.throws(()=>stations(demand,6),/usable numeric range/);
});
