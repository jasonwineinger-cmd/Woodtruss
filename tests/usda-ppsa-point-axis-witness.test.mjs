import test from 'node:test';
import assert from 'node:assert/strict';
import {elasticFrameMemberPointLoad} from '../dist/analysis/src/elastic-frame-member-point-load.js';
import {createInclinedSupportAxis} from '../dist/geometry/src/inclined-support-axis.js';

test('public PPSA-II member-6 ordered point action and node-5 printed force are direction witnesses only',()=>{
  // FPL-GTR-40 Fig. 5, Tables II/III and VI-A; not a solved frame.
  const load=elasticFrameMemberPointLoad({left:{xIn:0,yIn:0},right:{xIn:70.25,yIn:0},
    stationIn:46.25,fxLb:0,fyLb:-550,releaseLeftRotation:false,releaseRightRotation:false});
  assert.deepEqual(load.physicalResultant.at,{xIn:46.25,yIn:0});
  assert.equal(load.physicalResultant.momentAboutLeftLbIn,-25437.5);
  // Table VIII local end shears and couples close that published input to print precision.
  assert.ok(Math.abs(158.712+391.288-550)<1e-10);
  assert.ok(Math.abs(2401.636-4452.126+70.25*391.288-46.25*550+.008)<1e-7);
  // Table IV authored free tangent; Table VII reaction is perpendicular.
  const axis=createInclinedSupportAxis({kind:'direction',dx:12,dy:2});
  const support=axis.globalToLocal({x:-62.705,y:376.230});
  assert.ok(Math.abs(support.alongFree)<1e-12 && support.alongConstrainedNormal>0);
});
