import test from 'node:test';
import assert from 'node:assert/strict';
import '../vendor/cvnss4-v5.js';
import {
  ALPHABET,toTrits,fromTrits,mappingProof,encodeTransport,decodeTransport,
  buildPatches,applyPatches,packProof,unpackProof
} from '../src/ternary.js';

const converter=globalThis.CVNSSConverter;
assert.ok(converter && converter.VERSION==='5.0.0-audit-safe','Vendor converter v5 must be loaded');

test('27 unique balanced-trit triples, exhaustive inverse',()=>{
  assert.equal(ALPHABET.length,27);
  const m=mappingProof();
  assert.equal(m.ok,true);assert.equal(m.distinct,27);assert.equal(m.checked,27);
  for(let d=0;d<27;d++)assert.equal(fromTrits(toTrits(d)),d);
});

test('rejects invalid digits and malformed triples',()=>{
  assert.throws(()=>toTrits(27));
  assert.throws(()=>toTrits(-1));
  assert.throws(()=>fromTrits([1,1,2]));
  assert.throws(()=>fromTrits([1,1]));
});

test('direct 27 and UTF8-pair27 transport are reversible',()=>{
  const cases=['',' abc xyz','toiy iwy vidf nam','A-Z, à ê 🤖','ĐIỆN TOÁN!','\u0301 e\u0300','🙂🤖'];
  for(const s of cases){const enc=encodeTransport(s);assert.equal(enc.trits.length,enc.digits.length*3);assert.equal(decodeTransport(enc),s);}
  assert.throws(()=>decodeTransport({mode:'utf8-pair27',digits:[26,26]}));
});

test('v5 internal audit and collision samples',()=>{
  const a=converter.audit(),s=converter.selfTest();
  assert.equal(s.failures.length,0);
  assert.equal(a.ambiguityGroups,56);
  assert.equal(a.criticalCollisionGroups,5);
  assert.equal(converter.fromCqn('iên').cvss,converter.fromCqn('yên').cvss);
  assert.equal(converter.fromCqn('oà').cvss,converter.fromCqn('òa').cvss);
  assert.notEqual('iên','yên');
});

test('Unicode patches including insertions, deletion, emoji and NFD',()=>{
  const pairs=[
    ['iên','yên'],['oà','òa'],['ABC','abc'],['a',''],['','hello'],
    ['Xin chào','xin cHào'],['🤖', 'robot 🤖'],['a\u0301','á'],
    ['Dòng 1\nDòng 2\t','Dòng 1\nDòng 2']
  ];
  for(const [base,origin] of pairs)assert.equal(applyPatches(base,buildPatches(base,origin)),origin);
  assert.throws(()=>applyPatches('abc',[{at:9,remove:2,insert:'x'}]));
});

test('lossless proof packet restores exact Unicode UTF8 with SHA256 check',async()=>{
  const cases=['',' ','iên yên, oà òa','Tôi yêu Việt Nam','NFC / NFD: á a\u0301','ĐIỆN TOÁN TAM PHÂN','🤖 — SLAM / RUL / 2026','\n\t  ','a'.repeat(500)+'🤖'];
  for(const original of cases){
    const x=await packProof(original,converter);
    assert.equal(x.packetRoundtrip,true);
    assert.equal(x.restored,original);
    assert.equal((await unpackProof(x.packet,converter)).text,original);
    assert.equal(x.tritCount,3*x.digitCount);
    assert.ok(x.packetBytes>0);
  }
});

test('any tamper that changes recovered bytes must fail SHA256 integrity',async()=>{
  const x=await packProof('iên yên. Tôi yêu Việt Nam!',converter);
  const packet=structuredClone(x.packet);
  packet.patches=[{at:0,remove:0,insert:'tampered'}];
  await assert.rejects(unpackProof(packet,converter),/SHA-256|length|invalid/i);
});

test('seeded deterministic fuzz: 160 exact round-trips',async()=>{
  let seed=0x1234abcf;
  function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed}
  const options=['iên','yên','oà','òa','ĐIỆN','á','a\u0301','🤖','A','?', '\t','\n','  ','127','tiếng',''];
  for(let k=0;k<160;k++){
    let original='';
    const len=rnd()%25;
    for(let j=0;j<len;j++) original+=options[rnd()%options.length];
    const p=await packProof(original,converter);
    assert.equal((await unpackProof(p.packet,converter)).text,original,'fuzz case '+k);
  }
});
