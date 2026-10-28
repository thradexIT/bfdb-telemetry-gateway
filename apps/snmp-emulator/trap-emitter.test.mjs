import {test} from 'node:test';
import assert from 'node:assert/strict';
import snmp from 'net-snmp';
import {LAB_TRAP_ROOT, realisticVarbinds, splitVarbinds, trapSettings} from './trap-emitter.mjs';
test('bounded Eltek-like trap model sends diverse BER types, actual zero and changing dynamic state',()=>{
 const first=realisticVarbinds({bfdbId:'BFDB-01',sequence:0});
 const next=realisticVarbinds({bfdbId:'BFDB-01',sequence:1});
 assert.ok(first.length>=100);
 assert.equal(first.length,next.length);
 assert.ok(first.every(x=>x.oid.startsWith(LAB_TRAP_ROOT+'.')));
 assert.ok(first.some(x=>x.type===snmp.ObjectType.Integer&&x.value===0));
 assert.ok(first.some(x=>x.type===snmp.ObjectType.Integer&&x.value===4));
 assert.ok(first.some(x=>x.type===snmp.ObjectType.OctetString&&Buffer.isBuffer(x.value)));
 assert.notDeepEqual(first,next);
 const packets=splitVarbinds(first,24);
 assert.equal(packets.reduce((n,x)=>n+x.length,0),first.length);
 assert.ok(packets.every(x=>x.length<=24));
});
test('wire transport must be explicit, private and bounded',()=>{
 assert.throws(()=>trapSettings({SNMP_VERSION:'2c'}),/TARGET_HOST/);
 assert.throws(()=>trapSettings({SNMP_TRAP_TARGET_HOST:'localhost',SNMP_VERSION:'2c'}),/COMMUNITY/);
 assert.throws(()=>trapSettings({SNMP_TRAP_TARGET_HOST:'localhost',SNMP_VERSION:'2c',SNMP_COMMUNITY:'private',SNMP_TRAP_BATCH_SIZE:'5000'}),/BATCH_SIZE/);
 const s=trapSettings({SNMP_TRAP_TARGET_HOST:'127.0.0.1',SNMP_VERSION:'2c',SNMP_COMMUNITY:'private',SNMP_TRAP_ONCE:'true'});
 assert.equal(s.batchSize,24);
 assert.equal(s.port,1162);
});
