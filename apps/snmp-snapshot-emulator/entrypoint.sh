#!/bin/sh
set -eu

: "${SNMP_WALK_FILE:?Set SNMP_WALK_FILE to the private Smartpack2 walk mount}"
: "${SNMP_MIB_FILES:?Set SNMP_MIB_FILES to colon-separated private Eltek MIB mounts}"
: "${SNMP_COMMUNITY:?Set a private SNMPv2c lab community}"

case "${SNMP_COMMUNITY}" in
  *[!A-Za-z0-9_.-]*|'')
    echo "SNMP_COMMUNITY must contain only A-Z a-z 0-9 _ . -" >&2
    exit 2
    ;;
esac

PORT="${SNMP_AGENT_PORT:-1161}"
case "${PORT}" in
  *[!0-9]*|'')
    echo "SNMP_AGENT_PORT must be numeric" >&2
    exit 2
    ;;
esac
if [ "${PORT}" -lt 1024 ] || [ "${PORT}" -gt 65535 ]; then
  echo "SNMP_AGENT_PORT must be 1024..65535" >&2
  exit 2
fi

mkdir -p /runtime/data /tmp/snmpsim-cache
python /app/build_snapshot.py \
  --walk "${SNMP_WALK_FILE}" \
  --mib-list "${SNMP_MIB_FILES}" \
  --out-snmprec "/runtime/data/${SNMP_COMMUNITY}.snmprec" \
  --out-json /runtime/snapshot.json \
  --out-manifest /runtime/manifest.json

chmod -R a+rX /runtime
chown -R snmpsim:snmpsim /tmp/snmpsim-cache

exec snmpsim-command-responder \
  --data-dir=/runtime/data \
  --cache-dir=/tmp/snmpsim-cache \
  --agent-udpv4-endpoint="0.0.0.0:${PORT}" \
  --process-user=snmpsim \
  --process-group=snmpsim \
  --log-level="${SNMP_SIM_LOG_LEVEL:-info}"
