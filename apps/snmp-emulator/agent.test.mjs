import assert from 'node:assert/strict';
import { test } from 'node:test';
import snmp from 'net-snmp';
import { createReadOnlyAgent } from './agent.mjs';
import { INPUT_FEEDS } from './oid-profile.mjs';

function user() {
  return {name:'emulatedlab',level:snmp.SecurityLevel.authPriv,
    authProtocol:snmp.AuthProtocols.sha,authKey:'laboratory_auth_passphrase',
    privProtocol:snmp.PrivProtocols.aes,privKey:'laboratory_priv_passphrase'};
}
function query(session, oids) {
  return new Promise((resolve,reject)=>{
    session.get(oids,(error,results)=>{
      if(error)return reject(error);
      if(results.some(snmp.isVarbindError))return reject(new Error('SNMP varbind error'));
      resolve(results);
    });
  });
}
function set(session, oid, value) {
  return new Promise(resolve=>{
    session.set([{oid,type:snmp.ObjectType.Integer,value}],(error,values)=>{
      resolve({error,values});
    });
  });
}
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

test('real UDP SNMPv3 authPriv GET returns A/B current and signed DC voltage; SET cannot alter values',async()=>{
  const port=24000+Math.floor(Math.random()*18000);
  const conf={bfdbId:'BFDB-01',sourceIdentity:'EMU-DELTA-BFDB-01',
    scenario:'NORMAL',username:user().name,authKey:user().authKey,privKey:user().privKey,
    port,host:'127.0.0.1',intervalMs:500};
  const server=createReadOnlyAgent(conf);
  const session=snmp.createV3Session('127.0.0.1',user(),{port,timeout:1400,retries:1});
  try {
    await sleep(120);
    const oids=INPUT_FEEDS.flatMap(feed=>[feed.currentOid,feed.voltageOid]);
    const samples=await query(session,oids);
    assert.equal(samples.length,4);
    assert.deepEqual(samples.map(s=>s.oid),oids);
    assert.ok(samples[0].value>0);
    assert.ok(samples[1].value<0);
    assert.ok(samples[2].value>0);
    assert.ok(samples[3].value<0);
    const before=samples[0].value;
    await set(session,oids[0],99999);
    const after=await query(session,[oids[0]]);
    assert.ok(after[0].value < 10000,'read-only agent must not apply SET mutation');
    assert.ok(Math.abs(after[0].value-before)<1000,'normal generator drift only');
  } finally {
    session.close();
    server.stop();
  }
});

test('missing feed scenario exposes no B instances',async()=>{
  const port=24000+Math.floor(Math.random()*18000);
  const u=user();
  const instance=createReadOnlyAgent({bfdbId:'BFDB-02',sourceIdentity:'EMU-DELTA-BFDB-02',
    scenario:'MISSING_FEED_B',username:u.name,authKey:u.authKey,privKey:u.privKey,
    port,host:'127.0.0.1',intervalMs:1000});
  const session=snmp.createV3Session('127.0.0.1',u,{port,timeout:1000,retries:0});
  try {
    await sleep(100);
    const a=await query(session,[INPUT_FEEDS[0].currentOid]);
    assert.ok(a[0].value>0);
    const b=await new Promise(resolve=>session.get([INPUT_FEEDS[1].currentOid],(error,varbinds)=>resolve({error,varbinds})));
    assert.ok(b.error||b.varbinds?.some(snmp.isVarbindError));
  } finally {
    session.close();
    instance.stop();
  }
});

test('Configuration 4 answers real SNMPv3 UDP GET for eight independent scalars', async () => {
  const { CONFIG4_INPUT_FEEDS, ELTEK_BDCBB_CONFIG_4 } = await import('./oid-profile.mjs');
  const port = 24000 + Math.floor(Math.random() * 18000);
  const u = user();
  const conf = {
    bfdbId: 'BFDB-03', sourceIdentity: 'EMU-DELTA-BFDB-03',
    profile: ELTEK_BDCBB_CONFIG_4, scenario: 'NORMAL',
    username: u.name, authKey: u.authKey, privKey: u.privKey,
    port, host: '127.0.0.1', intervalMs: 1000,
  };
  const agent = createReadOnlyAgent(conf);
  const session = snmp.createV3Session('127.0.0.1', u, { port, timeout: 1400, retries: 1 });
  try {
    await sleep(120);
    const oids = CONFIG4_INPUT_FEEDS.flatMap((f) => [f.currentOid, f.voltageOid]);
    const result = await query(session, oids);
    assert.deepEqual(result.map((v) => v.oid), oids);
    for (let i = 0; i < result.length; i += 2) {
      assert.ok(result[i].value > 0);
      assert.ok(result[i+1].value < 0);
    }
  } finally {
    session.close();
    agent.stop();
  }
});

test('Configuration 4 missing A2 shunt is noSuchInstance, never a fabricated zero', async () => {
  const { CONFIG4_INPUT_FEEDS, ELTEK_BDCBB_CONFIG_4 } = await import('./oid-profile.mjs');
  const port = 24000 + Math.floor(Math.random() * 18000);
  const u = user();
  const agent = createReadOnlyAgent({
    bfdbId: 'BFDB-02', sourceIdentity: 'EMU-DELTA-BFDB-02',
    profile: ELTEK_BDCBB_CONFIG_4, scenario: 'MISSING_A2',
    username: u.name, authKey: u.authKey, privKey: u.privKey,
    port, host: '127.0.0.1', intervalMs: 1000,
  });
  const session = snmp.createV3Session('127.0.0.1', u, { port, timeout: 1000, retries: 0 });
  try {
    await sleep(120);
    assert.ok((await query(session, [CONFIG4_INPUT_FEEDS[0].currentOid]))[0].value > 0);
    const missing = await new Promise((resolve) => session.get(
      [CONFIG4_INPUT_FEEDS[1].currentOid], (error, values) => resolve({ error, values }),
    ));
    assert.ok(missing.error || missing.values?.some(snmp.isVarbindError));
  } finally {
    session.close();
    agent.stop();
  }
});
