import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogElasticSectionMatches as matches } from '../dist/lumber/src/catalog-elastic-section-axis-check.js';

// Literal synthetic dimensions, not nominal or catalog stock.
const row={actualWidthIn:2,actualDepthIn:4,ePsi:1200000,eMinPsi:350000};
const member=(secondMomentIn4,elasticModulusPsi=row.ePsi,areaIn2=8)=>({
  areaIn2,secondMomentIn4,elasticModulusPsi,
});

test('hand rectangle has two directional moments and an exact selected modulus',()=>{
  // 2*4^3/12 = 32/3; 4*2^3/12 = 8/3; both see area 2*4 = 8.
  assert.equal(matches(row,member(32/3),'about-width','catalog-mean'),true);
  assert.equal(matches(row,member(8/3,row.eMinPsi),'about-depth','catalog-minimum'),true);
  assert.equal(matches(row,member(32/3),'about-depth','catalog-mean'),false);
  assert.equal(matches(row,member(8/3,row.eMinPsi),'about-width','catalog-minimum'),false);
  assert.equal(matches(row,member(32/3,row.eMinPsi),'about-width','catalog-mean'),false);
  assert.equal(matches(row,member(32/3),'about-width','catalog-minimum'),false);
});

test('a square still requires explicit axis and modulus basis',()=>{
  const square={...row,actualDepthIn:2};
  const authored=member(4/3,row.ePsi,4);
  for(const axis of ['about-width','about-depth'])
    assert.equal(matches(square,authored,axis,'catalog-mean'),true);
  assert.equal(matches(square,authored,undefined,'catalog-mean'),false);
  assert.equal(matches(square,authored,'about-width',undefined),false);
  assert.equal(matches(square,authored,'auto','catalog-mean'),false);
});

test('admits representation noise in section arithmetic, not engineering or modulus tolerance',()=>{
  const e=Number.EPSILON;
  assert.equal(matches(row,member((32/3)*(1+4*e),row.ePsi,8*(1-4*e)),'about-width','catalog-mean'),true);
  assert.equal(matches(row,member((32/3)*(1+256*e)),'about-width','catalog-mean'),false);
  assert.equal(matches(row,member(32/3,row.ePsi*(1+e)),'about-width','catalog-mean'),false);
  assert.equal(matches(row,member(Number.MIN_VALUE),'about-width','catalog-mean'),false);
  assert.equal(matches({...row,actualWidthIn:Number.MIN_VALUE},member(32/3),'about-width','catalog-mean'),false);
});
