import snmp from 'net-snmp';
import { assertConfig, feedSnapshot, inputFeeds, isPublishedFeed } from './oid-profile.mjs';

export function createReadOnlyAgent(config) {
  assertConfig(config);
  const agent = snmp.createAgent({
    port: config.port,
    address: config.host || '0.0.0.0',
    transport: 'udp4',
    disableAuthorization: false,
    accessControlModelType: snmp.AccessControlModelType.Simple,
  }, (error) => {
    if (error) console.warn(JSON.stringify({event:'snmp.agent.error',reason:error.message}));
  });
  const authorizer = agent.getAuthorizer();
  const user = {
    name: config.username,
    level: snmp.SecurityLevel.authPriv,
    authProtocol: snmp.AuthProtocols.sha,
    authKey: config.authKey,
    privProtocol: snmp.PrivProtocols.aes,
    privKey: config.privKey,
  };
  if (config.snmpVersion === '2c') {
    authorizer.addCommunity(config.community);
    authorizer.getAccessControlModel().setCommunityAccess(config.community, snmp.AccessLevel.ReadOnly);
  } else {
    authorizer.addUser(user);
    authorizer.getAccessControlModel().setUserAccess(user.name, snmp.AccessLevel.ReadOnly);
  }

  const mib = agent.getMib();
  const published = inputFeeds(config.profile).filter((feed) => isPublishedFeed(feed.id, config.scenario));
  for (const feed of published) {
    for (const [metric, oid] of [['current', feed.currentOid], ['voltage', feed.voltageOid]]) {
      const name = `${feed.id}-${metric}`;
      mib.registerProvider({
        name,
        type: snmp.MibProviderType.Scalar,
        oid: oid.slice(0, -2),
        scalarType: snmp.ObjectType.Integer,
        maxAccess: snmp.MaxAccess['read-only'],
      });
    }
  }

  const started = performance.now();
  const update = () => {
    const measurements = feedSnapshot(config.bfdbId, (performance.now() - started) / 1000, config.scenario, config.profile);
    for (const feed of published) {
      mib.setScalarValue(`${feed.id}-current`, measurements[feed.id].currentDeciA);
      mib.setScalarValue(`${feed.id}-voltage`, measurements[feed.id].voltageDeciV);
    }
  };
  update();
  const timer = setInterval(update, config.intervalMs);
  return {
    agent, published,
    stop() {
      clearInterval(timer);
      agent.close();
    },
  };
}
