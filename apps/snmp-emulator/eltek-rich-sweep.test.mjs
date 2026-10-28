import assert from 'node:assert/strict';
import { test } from 'node:test';
import dgram from 'node:dgram';
import { once } from 'node:events';
import snmp from 'net-snmp';
import {
  TARGET_INVENTORY_SIZE, PRIVATE_LAB_NOTIFICATION,
  syntheticInventory, knownEltekSample, emitSyntheticInventory,
} from './eltek-rich-sweep.mjs';

test('emulates 5407 heterogeneous SNMP points without customer capture data', () => {
  const rows = syntheticInventory();
  assert.equal(rows.length, TARGET_INVENTORY_SIZE);
  assert.equal(new Set(rows.map(v => v.oid)).size, TARGET_INVENTORY_SIZE);
  assert.equal(rows.find(v => v.oid.endsWith('.10.10.5.5.0')).value, 5389);
  assert.equal(rows.find(v => v.oid.endsWith('.10.9.2.5.0')).value, 91);
  assert.equal(rows.find(v => v.oid.endsWith('.10.15.18.8.1.2.1')).value, 4);
  assert.equal(rows.find(v => v.oid.endsWith('.10.10.15.2.0')).value, 0);
  assert.ok(rows.filter(v => v.value === 0).length > 4000);
  assert.ok(rows.some(v => Buffer.isBuffer(v.value) && v.value.length === 0));
  assert.ok(rows.some(v => Buffer.isBuffer(v.value) && v.value.length > 0));
  assert.ok(rows.some(v => typeof v.value === 'string'));
  assert.ok(knownEltekSample().every(v => v.oid.startsWith('1.3.6.1.4.1.12148.10.')));
  assert.throws(() => syntheticInventory(10001));
});

test('bounded UDP SNMPv2c sweep receives each varbind exactly once', async () => {
  const probe = dgram.createSocket('udp4');
  probe.bind(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  probe.close();
  const received = [];
  const receiver = snmp.createReceiver(
    { port, address: '127.0.0.1', disableAuthorization: false },
    (error, packet) => {
      assert.ifError(error);
      received.push(packet);
    },
  );
  receiver.getAuthorizer().addCommunity('rich-test-only');
  await new Promise(resolve => setTimeout(resolve, 30));
  try {
    const result = await emitSyntheticInventory(
      { host: '127.0.0.1', port, version: '2c', community: 'rich-test-only', inform: false },
      { count: 120, batchSize: 12, intervalMs: 8 },
    );
    for (let i = 0; i < 60 && received.length < result.pdus; i++)
      await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(result.complete, true);
    assert.equal(result.pdus, 10);
    assert.equal(received.length, 10);
    const observed = received.flatMap(packet =>
      packet.pdu.varbinds.filter(v =>
        v.oid.startsWith('1.3.6.1.4.1.12148.10.') ||
        v.oid.startsWith('1.3.6.1.4.1.8072.9999.2026.54.')));
    assert.equal(observed.length, 120);
    assert.equal(new Set(observed.map(v => v.oid)).size, 120);
    for (const packet of received) {
      assert.equal(packet.pdu.varbinds.find(v => v.oid === '1.3.6.1.6.3.1.1.4.1.0').value,
        PRIVATE_LAB_NOTIFICATION);
    }
  } finally {
    receiver.close();
  }
});

test('rejects unsupported payload and unsafe transport configuration before sending', async () => {
  await assert.rejects(emitSyntheticInventory({ host: '127.0.0.1', port: 1162,
    version: '2c', community: 'lab-only' }, { count: 10, batchSize: 300 }));
  await assert.rejects(emitSyntheticInventory({ host: '127.0.0.1', port: 1162,
    version: '3', username: 'user', authKey: 'x', privKey: 'y' }, { count: 10 }));
});
