import snmp from 'net-snmp';
import { pathToFileURL } from 'node:url';

// Synthetic transport/stress payload shaped after the supplied Smartpack2 Touch
// inventory. The seven known sample OIDs use rev54 definitions; the remaining
// points use a clearly private lab subtree, NOT invented vendor OIDs.
export const TARGET_INVENTORY_SIZE = 5407;
export const PRIVATE_LAB_OID = '1.3.6.1.4.1.8072.9999.2026.54';
export const PRIVATE_LAB_NOTIFICATION = PRIVATE_LAB_OID + '.0.1';
export const RICH_ENGINEERING_RAW = Object.freeze({
  voltage: 5389, // observed-style raw; lab scale 0.01 V, not firmware certification
  current: 91,   // observed-style raw; lab scale 1 A
  temperature: 253, // lab scale 0.1 degC
});

const INTEGER = snmp.ObjectType.Integer;
const TEXT = snmp.ObjectType.OctetString;

// Actual rev54 MIB base OIDs, with synthetic test instances and values.
// Command-class OIDs are *observations only*. This emitter never issues SET.
export function knownEltekSample() {
  const items = [
    ['1.3.6.1.4.1.12148.10.10.5.5.0', INTEGER, RICH_ENGINEERING_RAW.voltage],
    ['1.3.6.1.4.1.12148.10.9.2.5.0', INTEGER, RICH_ENGINEERING_RAW.current],
    ['1.3.6.1.4.1.12148.10.10.7.5.0', INTEGER, RICH_ENGINEERING_RAW.temperature],
    ['1.3.6.1.4.1.12148.10.2.1.0', INTEGER, 1], // normal
    ['1.3.6.1.4.1.12148.10.15.18.8.1.6.1', INTEGER, 86], // fuse RAW
    ['1.3.6.1.4.1.12148.10.15.18.8.1.2.1', INTEGER, 4], // disabled
    ['1.3.6.1.4.1.12148.10.10.15.2.0', INTEGER, 0], // pushbutton
    ['1.3.6.1.4.1.12148.10.10.18.3.1.6.1', INTEGER, 251], // temperature raw
    ['1.3.6.1.4.1.12148.10.15.5.5.0', INTEGER, 5372],
  ];
  const labels = ['Fuse A3', 'Fuse B3', 'Fuse A2', 'Fuse B2', 'Fuse A1', 'Fuse B1'];
  for (let n = 0; n < labels.length; n++)
    items.push([`1.3.6.1.4.1.12148.10.11.4.1.3.1.${n + 1}`, TEXT, labels[n]]);
  return items.map(([oid, type, value]) => ({ oid, type, value }));
}

/** Exact point count; no site names, serials, secrets or customer RAW data. */
export function syntheticInventory(count = TARGET_INVENTORY_SIZE) {
  if (!Number.isInteger(count) || count < 1 || count > 10000)
    throw new Error('SNMP synthetic inventory count must be 1..10000');
  const known = knownEltekSample();
  const result = known.slice(0, count);
  for (let i = 0; result.length < count; i++) {
    const k = i + 1;
    const oid = `${PRIVATE_LAB_OID}.${1 + (i % 6)}.${k}.0`;
    // Realistic signal shape: many dormant zeroes, empty descriptions,
    // vendor enums, counters, command-like observations and binary data.
    let type = INTEGER, value = 0;
    if (i % 71 === 0) { type = TEXT; value = Buffer.alloc(0); }
    else if (i % 101 === 0) { type = TEXT; value = Buffer.from([0, 255, 128, i & 255]); }
    else if (i % 89 === 0) { type = TEXT; value = `Input ${(i % 24) + 1}`; }
    else if (i % 73 === 0) value = 4; // disabled enum
    else if (i % 59 === 0) value = 1; // normal enum
    else if (i % 53 === 0) value = 86; // unscaled RAW
    else if (i % 47 === 0) value = 5350 + i % 70; // raw battery voltage range
    else if (i % 43 === 0) value = 20 + i % 240; // current, counter or setpoint
    result.push({ oid, type, value });
  }
  if (new Set(result.map(v => v.oid)).size !== count)
    throw new Error('Duplicate generated synthetic OID');
  return result;
}

function validateTarget(config, options) {
  if (!config || !config.host || !Number.isInteger(config.port) ||
      config.port < 1 || config.port > 65535 ||
      !['2c', '3'].includes(config.version))
    throw new Error('Synthetic inventory requires SNMPv2c or SNMPv3');
  if (config.version === '3' &&
      (!config.username || !config.authKey || !config.privKey ||
       config.authKey.length < 8 || config.privKey.length < 8))
    throw new Error('SNMPv3 authPriv required');
  if (config.version === '2c' && (!config.community || /[\r\n]/.test(config.community)))
    throw new Error('Private SNMPv2c community required');
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 24)
    throw new Error('Sweep batchSize must be 1..24 to stay under UDP MTU');
  if (!Number.isInteger(options.intervalMs) || options.intervalMs < 0 || options.intervalMs > 60000)
    throw new Error('Sweep intervalMs must be 0..60000');
}

function sessionFor(config) {
  const options = {
    port: config.port, trapPort: config.port,
    version: config.version === '3' ? snmp.Version3 : snmp.Version2c,
    timeout: 3000, retries: 2,
  };
  return config.version === '3'
    ? snmp.createV3Session(config.host, {
      name: config.username, level: snmp.SecurityLevel.authPriv,
      authProtocol: snmp.AuthProtocols.sha, authKey: config.authKey,
      privProtocol: snmp.PrivProtocols.aes, privKey: config.privKey,
    }, options)
    : snmp.createSession(config.host, config.community, options);
}

/** Informs require ACK: a successful return confirms receiver transport, not
 * Site Mapper, Mongo, Timescale or Metasys acceptance. Never assert those here.
 * No UDP message carries more than 24 application varbinds.
 */
export async function emitSyntheticInventory(config, {
  count = TARGET_INVENTORY_SIZE, batchSize = 16, intervalMs = 40,
  signal, onBatch = () => {},
} = {}) {
  validateTarget(config, { batchSize, intervalMs });
  const inventory = syntheticInventory(count);
  const session = sessionFor(config);
  let transmitted = 0, pdus = 0;
  const startUptime = Math.floor(Date.now() / 10) % 2_000_000_000;
  try {
    for (let offset = 0; offset < inventory.length; offset += batchSize) {
      if (signal?.aborted) break;
      const items = inventory.slice(offset, offset + batchSize);
      await new Promise((resolve, reject) => {
        session[config.inform ? 'inform' : 'trap'](
          PRIVATE_LAB_NOTIFICATION, items,
          { upTime: startUptime + pdus },
          error => error ? reject(error) : resolve(),
        );
      });
      transmitted += items.length;
      pdus++;
      onBatch({ transmitted, pdus, total: count });
      if (intervalMs && offset + batchSize < count)
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  } finally {
    session.close();
  }
  return { transmitted, pdus, expected: count, complete: transmitted === count };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = {
    host: process.env.SNMP_TRAP_TARGET_HOST || '127.0.0.1',
    port: Number(process.env.SNMP_TRAP_TARGET_PORT || 1162),
    version: process.env.SNMP_VERSION || '3',
    username: process.env.SNMP_V3_USERNAME,
    authKey: process.env.SNMP_V3_AUTH_KEY,
    privKey: process.env.SNMP_V3_PRIV_KEY,
    community: process.env.SNMP_COMMUNITY,
    inform: process.env.SNMP_TRAP_INFORM !== 'false',
  };
  const result = await emitSyntheticInventory(config, {
    count: Number(process.env.SNMP_LAB_SWEEP_COUNT || TARGET_INVENTORY_SIZE),
    batchSize: Number(process.env.SNMP_LAB_SWEEP_BATCH || 16),
    intervalMs: Number(process.env.SNMP_LAB_SWEEP_INTERVAL_MS || 40),
  });
  console.info(JSON.stringify({ event: 'synthetic.eltek.inventory.sent', ...result }));
  if (!result.complete) process.exitCode = 1;
}
