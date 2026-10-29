import fs from 'node:fs/promises';
import snmp from 'net-snmp';
import { emitInventory, PRIVATE_LAB_NOTIFICATION } from './eltek-rich-sweep.mjs';

function required(name) {
  const value = process.env[name];
  if (!value?.trim()) throw new Error('Missing required configuration: ' + name);
  return value.trim();
}

function integer(name, fallback, low, high) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < low || value > high)
    throw new Error('Invalid integer configuration: ' + name);
  return value;
}

const TYPE_MAP = Object.freeze({
  Integer: snmp.ObjectType.Integer,
  OctetString: snmp.ObjectType.OctetString,
  OID: snmp.ObjectType.OID,
  IpAddress: snmp.ObjectType.IpAddress,
  Counter: snmp.ObjectType.Counter,
  Gauge: snmp.ObjectType.Gauge,
  TimeTicks: snmp.ObjectType.TimeTicks,
  Opaque: snmp.ObjectType.Opaque,
  Counter64: snmp.ObjectType.Counter64,
});

async function readSnapshot(path, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const parsed = JSON.parse(await fs.readFile(path, 'utf8'));
      if (parsed?.schema !== 'telxius.smartpack2.snapshot.v1' || !Array.isArray(parsed.items))
        throw new Error('Unsupported Smartpack2 snapshot schema');
      if (parsed.items.length < 1 || parsed.items.length > 10000)
        throw new Error('Smartpack2 snapshot must contain 1..10000 items');

      return parsed.items.map((item) => {
        const type = TYPE_MAP[item.type];
        if (!type || typeof item.oid !== 'string')
          throw new Error('Unsupported Smartpack2 snapshot varbind');
        let value = item.value;
        if (item.type === 'OctetString' || item.type === 'Opaque')
          value = Buffer.from(String(value), 'utf8');
        return { oid: item.oid, type, value };
      });
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  throw lastError ?? new Error('Smartpack2 snapshot unavailable');
}

const snapshotFile = process.env.SNMP_SNAPSHOT_FILE || '/runtime/snapshot.json';
const sourceIdentity = process.env.TELXIUS_SNMP_SOURCE_ID || 'EMU-SMARTPACK2-LURIN';
const config = {
  host: required('SNMP_TRAP_TARGET_HOST'),
  port: integer('SNMP_TRAP_TARGET_PORT', 1162, 1, 65535),
  version: process.env.SNMP_VERSION || '3',
  username: process.env.SNMP_V3_USERNAME,
  authKey: process.env.SNMP_V3_AUTH_KEY,
  privKey: process.env.SNMP_V3_PRIV_KEY,
  community: process.env.SNMP_COMMUNITY,
  inform: process.env.SNMP_TRAP_INFORM !== 'false',
};
const batchSize = integer('SNMP_SNAPSHOT_BATCH_SIZE', 16, 1, 24);
const intervalMs = integer('SNMP_SNAPSHOT_BATCH_INTERVAL_MS', 40, 0, 60000);
const repeatSeconds = integer('SNMP_SNAPSHOT_REPEAT_SECONDS', 60, 0, 86400);
const waitMs = integer('SNMP_SNAPSHOT_WAIT_MS', 30000, 1000, 300000);

const inventory = await readSnapshot(snapshotFile, waitMs);
const controller = new AbortController();
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => controller.abort());

console.info(JSON.stringify({
  event: 'telxius.smartpack2.snapshot.sender.ready',
  sourceIdentity,
  objectCount: inventory.length,
  batchSize,
  repeatSeconds,
  transport: config.inform ? 'inform' : 'trap',
}));

do {
  const result = await emitInventory(config, inventory, {
    batchSize,
    intervalMs,
    signal: controller.signal,
    notificationOid: PRIVATE_LAB_NOTIFICATION,
  });
  console.info(JSON.stringify({
    event: 'telxius.smartpack2.snapshot.sent',
    sourceIdentity,
    ...result,
  }));
  if (!result.complete && !controller.signal.aborted)
    throw new Error('Smartpack2 evidence snapshot delivery incomplete');
  if (!repeatSeconds || controller.signal.aborted) break;
  await new Promise(resolve => {
    const timer = setTimeout(resolve, repeatSeconds * 1000);
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
} while (!controller.signal.aborted);
