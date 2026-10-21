/**
 * Synthetic laboratory OIDs only. No Delta/Eltek firmware MIB mapping asserted.
 * Existing two-feed profile and OIDs remain stable for prior commissioning.
 */
export const LAB_ROOT = '1.3.6.1.4.1.8072.9999.2026.48';
export const CONFIG4_LAB_ROOT = '1.3.6.1.4.1.8072.9999.2026.49';
export const GENERIC_2_FEED = 'GENERIC_2_FEED';
export const ELTEK_BDCBB_CONFIG_2 = 'ELTEK_BDCBB_CONFIG_2';
export const ELTEK_BDCBB_CONFIG_4 = 'ELTEK_BDCBB_CONFIG_4';

export const INPUT_FEEDS = Object.freeze([
  Object.freeze({ id: 'A', label: 'Feed A', currentOid: `${LAB_ROOT}.1.1.0`, voltageOid: `${LAB_ROOT}.2.1.0` }),
  Object.freeze({ id: 'B', label: 'Feed B', currentOid: `${LAB_ROOT}.1.2.0`, voltageOid: `${LAB_ROOT}.2.2.0` }),
]);

export const CONFIG4_INPUT_FEEDS = Object.freeze(
  ['A1', 'A2', 'B1', 'B2'].map((id, index) => Object.freeze({
    id, label: `Input ${id}`,
    currentOid: `${CONFIG4_LAB_ROOT}.1.${index + 1}.0`,
    voltageOid: `${CONFIG4_LAB_ROOT}.2.${index + 1}.0`,
  })),
);
export const SUPPORTED_BFDB = Object.freeze(['BFDB-01', 'BFDB-02', 'BFDB-03']);

const BASE_LOAD = {
  'BFDB-01': Object.freeze({ A: 220, B: 210, A1: 220, A2: 185, B1: 210, B2: 175 }),
  'BFDB-02': Object.freeze({ A: 184, B: 196, A1: 184, A2: 165, B1: 196, B2: 175 }),
  'BFDB-03': Object.freeze({ A: 245, B: 205, A1: 245, A2: 218, B1: 205, B2: 192 }),
};

export function inputFeeds(profile = GENERIC_2_FEED) {
  if (profile === GENERIC_2_FEED || profile === ELTEK_BDCBB_CONFIG_2) return INPUT_FEEDS;
  if (profile === ELTEK_BDCBB_CONFIG_4) return CONFIG4_INPUT_FEEDS;
  throw new Error('Unsupported SNMP_EMULATOR_PROFILE');
}

export function assertConfig({
  bfdbId, sourceIdentity, scenario, username, authKey, privKey, community, snmpVersion = '3', port, intervalMs,
  profile = GENERIC_2_FEED,
}) {
  inputFeeds(profile);
  if (!SUPPORTED_BFDB.includes(bfdbId)) throw new Error('SNMP_EMULATOR_BFDB_ID must identify BFDB-01, 02 or 03');
  if (typeof sourceIdentity !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(sourceIdentity))
    throw new Error('SNMP_EMULATOR_SOURCE_ID must be an approved stable identity');
  if (!['NORMAL', 'ZERO_FEED_A', 'HIGH_FEED_B', 'MISSING_FEED_B',
    'MISSING_A2', 'HIGH_B2'].includes(scenario))
    throw new Error('Unknown SNMP_EMULATOR_SCENARIO');
  if (snmpVersion !== '2c' && snmpVersion !== '3')
    throw new Error('SNMP_VERSION must be 2c or 3');
  if (snmpVersion === '3' && (!username || typeof username !== 'string' || !username.trim() ||
      typeof authKey !== 'string' || authKey.length < 8 ||
      typeof privKey !== 'string' || privKey.length < 8))
    throw new Error('SNMPv3 authPriv credentials incomplete');
  if (snmpVersion === '2c' && (!community || typeof community !== 'string' || /[\\r\\n]/.test(community)))
    throw new Error('SNMPv2c community must be provided');
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('SNMP_AGENT_PORT must be between 1024 and 65535');
  if (!Number.isInteger(intervalMs) || intervalMs < 200 || intervalMs > 60_000)
    throw new Error('SNMP_AGENT_UPDATE_MS must be between 200 and 60000');
}

/**
 * Synthetic upstream -53 V DC independent shunts, not an aggregate of the
 * existing 12-15 V MQTT breaker emulator. Integer deciamperes / decivolts.
 */
export function feedSnapshot(bfdbId, elapsedSeconds, scenario = 'NORMAL', profile = GENERIC_2_FEED) {
  if (!SUPPORTED_BFDB.includes(bfdbId)) throw new Error('Unknown BFDB');
  const feeds = inputFeeds(profile);
  const values = {};
  for (const [i, feed] of feeds.entries()) {
    const base = BASE_LOAD[bfdbId][feed.id];
    const variation = 7 * Math.sin(elapsedSeconds / 25 + i * 0.9)
      + 2.2 * Math.sin(elapsedSeconds / 7 + i * 1.7);
    const amps =
      (scenario === 'ZERO_FEED_A' && feed.id.startsWith('A')) ? 0 :
      (scenario === 'HIGH_FEED_B' && feed.id.startsWith('B')) ? 640 :
      (scenario === 'HIGH_B2' && feed.id === 'B2') ? 650 :
      Math.max(0, base + variation);
    const signedVolts = -53.25 - i * 0.22 + 0.15 * Math.sin(elapsedSeconds / 40 + i);
    values[feed.id] = {
      currentDeciA: Math.round(amps * 10),
      voltageDeciV: Math.round(signedVolts * 10),
    };
  }
  return values;
}

export function isPublishedFeed(feedId, scenario) {
  if (scenario === 'MISSING_A2' && feedId === 'A2') return false;
  if (scenario === 'MISSING_FEED_B' && feedId.startsWith('B')) return false;
  return true;
}

/** Each point can be commissioned to a single physical AccessPort in Site Mapper. */
export function collectorCommissioning(sourceIdentity, profile = GENERIC_2_FEED) {
  return {
    schemaVersion: 1, sourceIdentity,
    hardwareProfile: profile,
    measurements: inputFeeds(profile).flatMap((feed) => [
      { feed: feed.id, metric: 'CURRENT', oid: feed.currentOid, scale: 0.1, unit: 'A' },
      { feed: feed.id, metric: 'VOLTAGE', oid: feed.voltageOid, scale: 0.1, unit: 'V' },
    ]),
  };
}
