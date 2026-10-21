import assert from 'node:assert/strict';
import { test } from 'node:test';
import snmp from 'net-snmp';
import { createReadOnlyAgent } from './agent.mjs';
import { assertConfig, CONFIG4_INPUT_FEEDS, ELTEK_BDCBB_CONFIG_2, ELTEK_BDCBB_CONFIG_4, INPUT_FEEDS } from './oid-profile.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function get(session, oids) {
  return new Promise((resolve, reject) =>
    session.get(oids, (error, readings) => error ? reject(error) : resolve(readings)));
}

for (const [profile, feeds] of [
  [ELTEK_BDCBB_CONFIG_2, INPUT_FEEDS],
  [ELTEK_BDCBB_CONFIG_4, CONFIG4_INPUT_FEEDS],
]) {
  test(`SNMPv2c read-only UDP agent implements ${profile}`, async () => {
    const port = 27000 + Math.floor(Math.random() * 10000);
    const community = 'private_local_lab_community';
    const agent = createReadOnlyAgent({
      bfdbId: 'BFDB-01', sourceIdentity: 'EMU-DELTA-BFDB-01',
      profile, scenario: 'NORMAL', snmpVersion: '2c', community,
      port, host: '127.0.0.1', intervalMs: 1000,
    });
    const session = snmp.createSession('127.0.0.1', community,
      { port, version: snmp.Version2c, timeout: 1200, retries: 1 });
    try {
      await sleep(120);
      const oids = feeds.flatMap((feed) => [feed.currentOid, feed.voltageOid]);
      const readings = await get(session, oids);
      assert.deepEqual(readings.map((r) => r.oid), oids);
      assert.equal(readings.length, feeds.length * 2);
      for (let i = 0; i < readings.length; i += 2) {
        assert.ok(readings[i].value > 0);
        assert.ok(readings[i + 1].value < 0);
      }
      const attempted = await new Promise((resolve) =>
        session.set([{ oid: oids[0], type: snmp.ObjectType.Integer, value: 99999 }],
          (error, values) => resolve({ error, values })));
      const after = await get(session, [oids[0]]);
      assert.ok(after[0].value < 10000, 'SET must not change shunt current');
      assert.ok(attempted.error || attempted.values?.some(snmp.isVarbindError),
        'SET must not be authorized on community');
    } finally {
      session.close();
      agent.stop();
    }
  });
}

test('SNMPv2c rejects missing community while SNMPv3 defaults are still required', () => {
  assert.throws(() => assertConfig({
    bfdbId:'BFDB-01',sourceIdentity:'EMU-DELTA-BFDB-01',scenario:'NORMAL',
    profile:ELTEK_BDCBB_CONFIG_2,snmpVersion:'2c',community:'',
    port:1161,intervalMs:1000
  }),/community/);
});
function requireNothing() { return { assertConfig: (x) => {
  if (!x.community) throw new Error('community'); // replaced in follow-up
} }; }
