import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { test } from 'node:test';
import snmp from 'net-snmp';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function get(session, oids) {
  return new Promise((resolve, reject) =>
    session.get(oids, (error, varbinds) => error ? reject(error) : resolve(varbinds)));
}

async function waitReady(child, timeoutMs = 5000) {
  let stderr = '';
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Telxius Smartpack2 agent did not become ready: ' + stderr));
    }, timeoutMs);
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.stdout.on('data', (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (line.includes('telxius.smartpack2.agent.ready')) {
          clearTimeout(timer);
          resolve();
          return;
        }
      }
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error('Telxius Smartpack2 agent exited before ready: ' + code + ' ' + stderr));
    });
  });
}

test('Telxius Smartpack2 walk-backed agent serves observed v2c scalars and tables read-only', async () => {
  const port = 31000 + Math.floor(Math.random() * 9000);
  const community = 'private_telxius_ci_community';
  const child = spawn(process.execPath, ['telxius-smartpack2-walk-agent.mjs'], {
    cwd: import.meta.dirname,
    env: {
      ...process.env,
      SMARTPACK2_PROFILE_FILE: '../../config/telxius-smartpack2-walk.json',
      SNMP_VERSION: '2c',
      SNMP_COMMUNITY: community,
      SNMP_AGENT_HOST: '127.0.0.1',
      SNMP_AGENT_PORT: String(port),
      TELXIUS_SMARTPACK2_SN: 'EMU-SMARTPACK2-CI',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const session = snmp.createSession('127.0.0.1', community, {
    port,
    version: snmp.Version2c,
    timeout: 1200,
    retries: 1,
  });

  try {
    await waitReady(child);
    await sleep(80);

    const oids = [
      '1.3.6.1.4.1.12148.10.2.1.0',
      '1.3.6.1.4.1.12148.10.2.6.0',
      '1.3.6.1.4.1.12148.10.2.7.0',
      '1.3.6.1.4.1.12148.10.9.2.5.0',
      '1.3.6.1.4.1.12148.10.9.5.1.2.1',
      '1.3.6.1.4.1.12148.10.11.3.1.2.1',
      '1.3.6.1.4.1.12148.10.11.4.1.3.1.1',
      '1.3.6.1.4.1.12148.10.11.4.1.6.1.1',
    ];
    const values = await get(session, oids);
    assert.deepEqual(values.map((value) => value.oid), oids);
    assert.equal(values[0].value, 1);
    assert.equal(values[1].value.toString(), 'SmartPack2 Touch');
    assert.equal(values[2].value.toString(), 'EMU-SMARTPACK2-CI');
    assert.equal(values[3].value, 91);
    assert.equal(values[4].value, 1);
    assert.equal(values[5].value, 6);
    assert.equal(values[6].value.toString(), 'A3 Fuse alarm');
    assert.equal(values[7].value, 0);

    const attempted = await new Promise((resolve) =>
      session.set([{
        oid: '1.3.6.1.4.1.12148.10.9.2.5.0',
        type: snmp.ObjectType.Integer,
        value: 999,
      }], (error, result) => resolve({ error, result })));
    assert.ok(
      attempted.error || attempted.result?.some(snmp.isVarbindError),
      'SNMP SET must be denied',
    );

    const after = await get(session, ['1.3.6.1.4.1.12148.10.9.2.5.0']);
    assert.equal(after[0].value, 91);
  } finally {
    session.close();
    child.kill('SIGTERM');
    await sleep(40);
    if (!child.killed) child.kill('SIGKILL');
  }
});
