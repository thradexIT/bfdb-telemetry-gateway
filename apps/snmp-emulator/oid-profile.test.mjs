import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertConfig, collectorCommissioning, feedSnapshot, INPUT_FEEDS, SUPPORTED_BFDB,
} from './oid-profile.mjs';

function valid() {
  return { bfdbId:'BFDB-01', sourceIdentity:'EMU-DELTA-BFDB-01', scenario:'NORMAL',
    username:'testuser', authKey:'test_auth_password', privKey:'test_priv_password', port:1161, intervalMs:1000 };
}

test('three BFDBs each have two independent upstream feeds and stable lab OIDs', () => {
  for (const bfdbId of SUPPORTED_BFDB) {
    const s=feedSnapshot(bfdbId,4);
    assert.ok(s.A.currentDeciA>0 && s.B.currentDeciA>0);
    assert.ok(s.A.voltageDeciV < -480 && s.B.voltageDeciV < -480);
    assert.ok(s.A.voltageDeciV > -580 && s.B.voltageDeciV > -580);
  }
  assert.equal(new Set(INPUT_FEEDS.flatMap(x=>[x.currentOid,x.voltageOid])).size,4);
  assert.ok(INPUT_FEEDS.every(x=>x.currentOid.startsWith('1.3.6.1.4.1.8072.')));
});

test('current and voltage vary deterministically without mixing the 12V MQTT circuit amperes', () => {
  const early=feedSnapshot('BFDB-01',0);
  const late=feedSnapshot('BFDB-01',30);
  assert.notEqual(early.A.currentDeciA,late.A.currentDeciA);
  assert.equal(early.A.currentDeciA,2200);
  assert.equal(early.B.currentDeciA,Math.round((210+7*Math.sin(0.9)+2.2*Math.sin(1.7))*10));
  assert.equal(feedSnapshot('BFDB-01',0).A.voltageDeciV,early.A.voltageDeciV);
});

test('scenarios include zero load, high load and missing feed without inventing zero for absent metrics', () => {
  assert.equal(feedSnapshot('BFDB-01',10,'ZERO_FEED_A').A.currentDeciA,0);
  assert.equal(feedSnapshot('BFDB-01',10,'HIGH_FEED_B').B.currentDeciA,6400);
  assertConfig({...valid(),scenario:'MISSING_FEED_B'});
});

test('enforces SNMPv3 credentials, port and allowed identities', () => {
  assertConfig(valid());
  assert.throws(()=>assertConfig({...valid(),authKey:'short'}));
  assert.throws(()=>assertConfig({...valid(),privKey:''}));
  assert.throws(()=>assertConfig({...valid(),scenario:'unknown'}));
  assert.throws(()=>assertConfig({...valid(),bfdbId:'OTHER'}));
  assert.throws(()=>assertConfig({...valid(),port:161}));
});

test('commissioning profile explicitly declares OIDs and engineering scales for Site Mapper', () => {
  const p=collectorCommissioning('EMU-DELTA-BFDB-01');
  assert.equal(p.measurements.length,4);
  assert.equal(p.measurements.filter(x=>x.metric==='CURRENT').length,2);
  assert.ok(p.measurements.every(x=>x.scale===0.1));
});

test('Config 4 has 4 distinct feed OIDs, signed DC readings and backward-compatible generic profile', async () => {
  const { CONFIG4_INPUT_FEEDS, ELTEK_BDCBB_CONFIG_4, inputFeeds, isPublishedFeed } =
    await import('./oid-profile.mjs');
  assert.deepEqual(inputFeeds(ELTEK_BDCBB_CONFIG_4).map((feed) => feed.id), ['A1', 'A2', 'B1', 'B2']);
  assert.equal(new Set(CONFIG4_INPUT_FEEDS.flatMap((f) => [f.currentOid, f.voltageOid])).size, 8);
  assert.ok(CONFIG4_INPUT_FEEDS.every((f) => !INPUT_FEEDS.some(
    (old) => old.currentOid === f.currentOid)));
  assert.equal(collectorCommissioning('EMU-DELTA-BFDB-01', ELTEK_BDCBB_CONFIG_4)
    .measurements.length, 8);
  for (const id of SUPPORTED_BFDB) {
    const s = feedSnapshot(id, 12, 'NORMAL', ELTEK_BDCBB_CONFIG_4);
    assert.deepEqual(Object.keys(s), ['A1','A2','B1','B2']);
    assert.ok(Object.values(s).every((v) => v.currentDeciA > 0 &&
      v.voltageDeciV < -480 && v.voltageDeciV > -580));
    assert.equal(feedSnapshot(id, 12, 'HIGH_B2', ELTEK_BDCBB_CONFIG_4).B2.currentDeciA, 6500);
  }
  assert.equal(isPublishedFeed('A2', 'MISSING_A2'), false);
  assert.equal(isPublishedFeed('A1', 'MISSING_A2'), true);
  assertConfig({ ...valid(), profile: ELTEK_BDCBB_CONFIG_4, scenario: 'MISSING_A2' });
  assert.throws(() => assertConfig({ ...valid(), profile: 'INVALID' }));
});
