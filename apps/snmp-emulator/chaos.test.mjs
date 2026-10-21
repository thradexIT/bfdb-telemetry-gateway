import assert from 'node:assert/strict';
import { test } from 'node:test';
import snmp from 'net-snmp';
import { createReadOnlyAgent } from './agent.mjs';
import { CONFIG4_INPUT_FEEDS, ELTEK_BDCBB_CONFIG_4 } from './oid-profile.mjs';

function user() {
  return {
    name: 'isolated-chaos-operator', level: snmp.SecurityLevel.authPriv,
    authProtocol: snmp.AuthProtocols.sha, authKey: 'long_lab_authentication_2026',
    privProtocol: snmp.PrivProtocols.aes, privKey: 'long_lab_private_2026',
  };
}
function get(session, oids) {
  return new Promise((resolve, reject) => session.get(oids,
    (error, rows) => error ? reject(error) : resolve(rows)));
}
function set(session, oid, value) {
  return new Promise((resolve) => session.set([
    { oid, type: snmp.ObjectType.Integer, value },
  ], (error, rows) => resolve({ error, rows })));
}

test('three isolated SNMPv3 Config4 agents survive bounded concurrent GET probes without cross-talk', {
  timeout: 30_000,
}, async () => {
  const names = ['BFDB-01', 'BFDB-02', 'BFDB-03'];
  const base = 26000 + Math.floor(Math.random() * 8000);
  const u = user();
  const agents = [];
  const sessions = [];
  const allOids = CONFIG4_INPUT_FEEDS.flatMap((f) => [f.currentOid, f.voltageOid]);
  try {
    for (const [index, name] of names.entries()) {
      const port = base + index;
      agents.push(createReadOnlyAgent({
        bfdbId: name, sourceIdentity: 'CHAOS-' + name,
        profile: ELTEK_BDCBB_CONFIG_4, scenario: 'NORMAL',
        username: u.name, authKey: u.authKey, privKey: u.privKey,
        port, host: '127.0.0.1', intervalMs: 1000,
      }));
      sessions.push(snmp.createV3Session('127.0.0.1', u, {
        port, timeout: 1800, retries: 1,
      }));
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    let completed = 0;
    await Promise.all(sessions.map(async (session) => {
      for (let i = 0; i < 20; i++) {
        const readings = await get(session, allOids);
        assert.equal(readings.length, 8);
        assert.deepEqual(readings.map((reading) => reading.oid), allOids);
        assert.ok(readings.every((reading) => !snmp.isVarbindError(reading)));
        for (let x = 0; x < 8; x += 2) {
          assert.ok(readings[x].value > 0, 'missing positive current');
          assert.ok(readings[x + 1].value < 0, 'missing signed DC voltage');
        }
        completed++;
      }
    }));
    assert.equal(completed, 60);
    const before = (await get(sessions[0], [allOids[0]]))[0].value;
    await set(sessions[0], allOids[0], 900_000);
    const after = (await get(sessions[0], [allOids[0]]))[0].value;
    assert.ok(Math.abs(after - before) < 500, 'SNMP SET mutated read-only input current');
  } finally {
    for (const session of sessions) session.close();
    for (const agent of agents) agent.stop();
  }
});

test('missing A2 and high B2 are electrically distinct: absent OID does not imply zero', {
  timeout: 15_000,
}, async () => {
  const port = 35000 + Math.floor(Math.random() * 6000);
  const u = user();
  const agent = createReadOnlyAgent({
    bfdbId: 'BFDB-02', sourceIdentity: 'CHAOS-PARTIAL-BFDB',
    profile: ELTEK_BDCBB_CONFIG_4, scenario: 'MISSING_A2',
    username: u.name, authKey: u.authKey, privKey: u.privKey,
    port, host: '127.0.0.1', intervalMs: 1000,
  });
  const session = snmp.createV3Session('127.0.0.1', u, {
    port, timeout: 1800, retries: 1,
  });
  try {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const oids = CONFIG4_INPUT_FEEDS.map((f) => f.currentOid);
    const readings = await get(session, oids);
    assert.equal(readings.length, 4);
    assert.ok(readings[0].value > 0);
    assert.ok(snmp.isVarbindError(readings[1]), 'missing A2 must be an error, not 0 A');
    assert.ok(readings[2].value > 0);
    assert.ok(readings[3].value > 0);
  } finally {
    session.close();
    agent.stop();
  }
});
