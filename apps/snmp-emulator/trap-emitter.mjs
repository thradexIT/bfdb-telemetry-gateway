/**
 * Optional, LAB-ONLY SNMP Trap/Inform sender.
 * Uses real UDP SNMP PDUs, not a spreadsheet import or HTTP mock.
 * OIDs under the Net-SNMP private test enterprise are intentionally synthetic.
 * They are never presented as authenticated Eltek firmware OIDs.
 */
import snmp from 'net-snmp';
import { feedSnapshot, inputFeeds } from './oid-profile.mjs';

export const LAB_TRAP_ROOT = '1.3.6.1.4.1.8072.9999.2026.50';
export const LAB_NOTIFICATION_OID = LAB_TRAP_ROOT + '.0.1';
export const FULL_CATALOG_SIZE = 5407;

function boundedInteger(value, name, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(name + ' must be an integer between ' + min + ' and ' + max);
  }
  return number;
}
function vb(oid, type, value) { return { oid, type, value }; }
const INTEGER = snmp.ObjectType.Integer;
const STRING = snmp.ObjectType.OctetString;
export function realisticVarbinds({ bfdbId, profile = 'GENERIC_2_FEED', scenario = 'NORMAL', elapsed = 0, sequence = 0 }) {
  const values = feedSnapshot(bfdbId, elapsed, scenario, profile);
  const result = [];
  // Existing upstream DC input measurements are independent of MQTT circuit-level values.
  for (const [index, feed] of inputFeeds(profile).entries()) {
    const reading = values[feed.id];
    result.push(vb(LAB_TRAP_ROOT + '.1.' + (index + 1) + '.0', INTEGER, reading.voltageDeciV));
    result.push(vb(LAB_TRAP_ROOT + '.2.' + (index + 1) + '.0', INTEGER, reading.currentDeciA));
    result.push(vb(LAB_TRAP_ROOT + '.3.' + (index + 1) + '.0', INTEGER,
      reading.currentDeciA > 6000 ? 3 : reading.currentDeciA === 0 ? 4 : 1));
  }
  // The source envelope reproduces heterogeneous SNMP BER shapes observed in controller dumps.
  // This is a bounded rotating window of 96 synthetic states; a trap is NOT a full SNMP walk.
  for (let i = 0; i < 96; i++) {
    const position = i + 1;
    const family = 10 + Math.floor(i / 24);
    const mod = (i + sequence) % 37;
    const state = mod === 0 ? 4 : mod === 1 ? 2 : 1;
    result.push(vb(LAB_TRAP_ROOT + '.' + family + '.' + position + '.0', INTEGER, state));
  }
  result.push(vb(LAB_TRAP_ROOT + '.20.1.0', STRING, Buffer.from('BFDB lab controller / Eltek-like state')));
  result.push(vb(LAB_TRAP_ROOT + '.20.2.0', INTEGER, sequence % 2)); // observed command code only
  result.push(vb(LAB_TRAP_ROOT + '.20.3.0', STRING, Buffer.from([0x00, 0x01, 0xfe, 0xff])));
  result.push(vb(LAB_TRAP_ROOT + '.20.4.0', INTEGER, 0)); // a valid zero, never missing data
  result.push(vb(LAB_TRAP_ROOT + '.20.5.0', INTEGER, 4)); // disabled(4) style enum
  result.push(vb(LAB_TRAP_ROOT + '.20.6.0', INTEGER, 86)); // unscaled fuse/auxiliary RAW
  result.push(vb(LAB_TRAP_ROOT + '.21.1.0', INTEGER, sequence));
  return result;
}
/**
 * Full-catalog coverage model: precisely 5,407 DISTINCT OID instances.
 * Does not use a vendor spreadsheet or impersonate vendor OID definitions.
 * On real firmware, vendor-specific scaling/meaning still comes from MIB evidence.
 * The baseline set is deterministic, but values evolve with sequence.
 */
export function fullCatalogVarbinds({ bfdbId, profile = 'GENERIC_2_FEED', scenario = 'NORMAL', elapsed = 0, sequence = 0 }) {
  const base = realisticVarbinds({ bfdbId, profile, scenario, elapsed, sequence });
  const seen = new Set(base.map(item => item.oid));
  const result = [...base];
  let index = 1;
  while (result.length < FULL_CATALOG_SIZE) {
    const oid = LAB_TRAP_ROOT + '.30.' + index + '.0';
    index++;
    if (seen.has(oid)) continue;
    seen.add(oid);
    const family = index % 19;
    const raw = family === 0 ? Buffer.from('synthetic status ' + index)
      : family === 1 ? Buffer.from([0, 255, index % 256])
      : family === 2 ? 4
      : family === 3 ? 0
      : family === 4 ? 86
      : family === 5 ? (sequence + index) % 2
      : family === 6 ? -530 + (index % 9)
      : family === 7 ? Math.round(100 + 15 * Math.sin((sequence + index) / 17))
      : (index + sequence) % 4;
    result.push(vb(oid, Buffer.isBuffer(raw) ? STRING : INTEGER, raw));
  }
  return result;
}
export function splitVarbinds(varbinds, size = 24) {
  boundedInteger(size, 'SNMP_TRAP_BATCH_SIZE', 1, 48);
  const packets = [];
  for (let start = 0; start < varbinds.length; start += size) {
    packets.push(varbinds.slice(start, start + size));
  }
  return packets;
}
export function trapSettings(env = process.env) {
  const host = env.SNMP_TRAP_TARGET_HOST;
  if (!host || !/^[a-zA-Z0-9.:-]{1,255}$/.test(host)) throw new Error('SNMP_TRAP_TARGET_HOST required');
  const version = env.SNMP_VERSION || '3';
  if (version !== '3' && version !== '2c') throw new Error('Only v2c and v3 supported');
  const intervalMs = boundedInteger(env.SNMP_TRAP_INTERVAL_MS || 30000, 'SNMP_TRAP_INTERVAL_MS', 1000, 3600000);
  const port = boundedInteger(env.SNMP_TRAP_TARGET_PORT || 1162, 'SNMP_TRAP_TARGET_PORT', 1, 65535);
  const batchSize = boundedInteger(env.SNMP_TRAP_BATCH_SIZE || 24, 'SNMP_TRAP_BATCH_SIZE', 1, 48);
  if (version === '2c' && !env.SNMP_COMMUNITY) throw new Error('SNMP_COMMUNITY required');
  if (version === '3' && (!env.SNMP_V3_USERNAME || !env.SNMP_V3_AUTH_KEY ||
    env.SNMP_V3_AUTH_KEY.length < 8 || !env.SNMP_V3_PRIV_KEY || env.SNMP_V3_PRIV_KEY.length < 8))
    throw new Error('SNMPv3 authPriv credentials required');
  return {
    host, port, version, intervalMs, batchSize,
    inform: env.SNMP_TRAP_INFORM === 'true',
    fullCatalog: env.SNMP_TRAP_FULL_CATALOG === 'true',
  };
}
export async function sendSnapshot(config, settings, sequence = 0) {
  const elapsed = sequence * settings.intervalMs / 1000;
  const all = (settings.fullCatalog ? fullCatalogVarbinds : realisticVarbinds)({ ...config, elapsed, sequence });
  const chunks = splitVarbinds(all, settings.batchSize);
  const options = {port: settings.port, trapPort: settings.port, timeout: 2500, retries: 1};
  const session = settings.version === '3'
    ? snmp.createV3Session(settings.host, {
      name: config.username,
      level: snmp.SecurityLevel.authPriv,
      authProtocol: snmp.AuthProtocols.sha,
      authKey: config.authKey,
      privProtocol: snmp.PrivProtocols.aes,
      privKey: config.privKey,
    }, options)
    : snmp.createSession(settings.host, config.community, {...options, version: snmp.Version2c});
  try {
    for (const varbinds of chunks) {
      await new Promise((resolve, reject) => {
        const callback = (err) => err ? reject(err) : resolve();
        if (settings.inform) session.inform(LAB_NOTIFICATION_OID, varbinds, callback);
        else session.trap(LAB_NOTIFICATION_OID, varbinds, callback);
      });
    }
    return {packets: chunks.length, varbinds: all.length, sequence};
  } finally { session.close(); }
}
