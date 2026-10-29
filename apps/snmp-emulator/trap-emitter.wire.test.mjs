import { test } from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import { once } from 'node:events';
import snmp from 'net-snmp';
import { sendSnapshot, LAB_TRAP_ROOT } from './trap-emitter.mjs';

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
test('real UDP v2c trap wire: simulator sends heterogeneous, bounded PDUs', async () => {
  const socket = dgram.createSocket('udp4');
  socket.bind(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  socket.close();
  const received = [];
  const receiver = snmp.createReceiver({
    port, address: '127.0.0.1', transport: 'udp4',
    disableAuthorization: false,
  }, (error, notification) => {
    if (error) return;
    received.push(...notification.pdu.varbinds.filter((v) => v.oid.startsWith(LAB_TRAP_ROOT + '.')));
  });
  receiver.getAuthorizer().addCommunity('lab-wire-private');
  try {
    await pause(50);
    const receipt = await sendSnapshot({
      bfdbId: 'BFDB-01', profile: 'GENERIC_2_FEED', scenario: 'NORMAL',
      community: 'lab-wire-private',
    }, {
      host: '127.0.0.1', port, version: '2c', batchSize: 24,
      intervalMs: 30000, inform: false, fullCatalog: false,
    }, 0);
    for (let i = 0; i < 100 && received.length < receipt.varbinds; i++) await pause(20);
    assert.equal(receipt.varbinds, received.length);
    assert.ok(received.some((v) => v.type === snmp.ObjectType.Integer && v.value === 0));
    assert.ok(received.some((v) => v.type === snmp.ObjectType.OctetString && Buffer.isBuffer(v.value)));
  } finally {
    receiver.close();
  }
});
