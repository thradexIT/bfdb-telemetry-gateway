/**
 * These are test-only synthetic scalar OIDs under a Net-SNMP example subtree.
 * They are NOT registered Delta/Eltek OIDs and never assert vendor MIB compatibility.
 *
 * Site Mapper only cares that a real SNMPv3 GET returns the configured OIDs.
 * Real firmware MIB/OID mappings can later replace this commissioning profile.
 */
export const LAB_ROOT = '1.3.6.1.4.1.8072.9999.2026.48';

export const INPUT_FEEDS = Object.freeze([
  Object.freeze({ id: 'A', label: 'Feed A', currentOid: `${LAB_ROOT}.1.1.0`, voltageOid: `${LAB_ROOT}.2.1.0` }),
  Object.freeze({ id: 'B', label: 'Feed B', currentOid: `${LAB_ROOT}.1.2.0`, voltageOid: `${LAB_ROOT}.2.2.0` }),
]);

export const SUPPORTED_BFDB = Object.freeze(['BFDB-01', 'BFDB-02', 'BFDB-03']);

const BASE_LOAD = {
  'BFDB-01': Object.freeze({ A: 220, B: 210 }),
  'BFDB-02': Object.freeze({ A: 184, B: 196 }),
  'BFDB-03': Object.freeze({ A: 245, B: 205 }),
};

export function assertConfig({ bfdbId, sourceIdentity, scenario, username, authKey, privKey, port, intervalMs }) {
  if (!SUPPORTED_BFDB.includes(bfdbId)) throw new Error('SNMP_EMULATOR_BFDB_ID must identify BFDB-01, 02 or 03');
  if (typeof sourceIdentity !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(sourceIdentity))
    throw new Error('SNMP_EMULATOR_SOURCE_ID must be an approved stable identity');
  if (!['NORMAL','ZERO_FEED_A','HIGH_FEED_B','MISSING_FEED_B'].includes(scenario))
    throw new Error('Unknown SNMP_EMULATOR_SCENARIO');
  if (!username || typeof username !== 'string' || !username.trim())
    throw new Error('SNMP_V3_USERNAME must be configured');
  if (typeof authKey !== 'string' || authKey.length < 8 || typeof privKey !== 'string' || privKey.length < 8)
    throw new Error('SNMPv3 authPriv passphrases must contain at least 8 characters');
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('SNMP_AGENT_PORT must be between 1024 and 65535');
  if (!Number.isInteger(intervalMs) || intervalMs < 200 || intervalMs > 60_000)
    throw new Error('SNMP_AGENT_UPDATE_MS must be between 200 and 60000');
}

/**
 * A distinct upstream DC input-feed model (~ -53V) independent of the existing
 * Acrel/AWT circuit generator (~12-15V).  NEVER sum circuit currents as feeder amps.
 * Integer values model signed decivolts and positive deciamperes.
 */
export function feedSnapshot(bfdbId, elapsedSeconds, scenario = 'NORMAL') {
  if (!SUPPORTED_BFDB.includes(bfdbId)) throw new Error('Unknown BFDB');
  const values = {};
  for (const [i, feed] of INPUT_FEEDS.entries()) {
    const nominal = BASE_LOAD[bfdbId][feed.id];
    const modulation = 7 * Math.sin(elapsedSeconds / 25 + i * 0.9)
      + 2.2 * Math.sin(elapsedSeconds / 7 + i * 1.7);
    const amps = scenario === 'ZERO_FEED_A' && feed.id === 'A' ? 0 :
      scenario === 'HIGH_FEED_B' && feed.id === 'B' ? 640 :
      Math.max(0, nominal + modulation);
    const voltage = -53.25 - i * 0.22 + 0.15 * Math.sin(elapsedSeconds / 40 + i);
    values[feed.id] = {
      currentDeciA: Math.round(amps * 10),
      voltageDeciV: Math.round(voltage * 10),
    };
  }
  return values;
}

export function collectorCommissioning(sourceIdentity) {
  const measurements = INPUT_FEEDS.flatMap((feed) => [
    { feed: feed.id, metric: 'CURRENT', oid: feed.currentOid, scale: 0.1, unit: 'A' },
    { feed: feed.id, metric: 'VOLTAGE', oid: feed.voltageOid, scale: 0.1, unit: 'V' },
  ]);
  return { schemaVersion: 1, sourceIdentity, measurements };
}
