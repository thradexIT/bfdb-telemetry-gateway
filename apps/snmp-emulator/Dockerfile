FROM node:22.16.0-alpine
WORKDIR /app
COPY apps/snmp-emulator/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY apps/snmp-emulator/*.mjs ./
COPY config/telxius-smartpack2-walk.json /app/config/telxius-smartpack2-walk.json
# Field checkouts may inherit a restrictive umask (e.g. 077).
# Normalize runtime assets before dropping privileges so USER node can read them.
RUN chmod 0644 /app/*.mjs /app/config/telxius-smartpack2-walk.json
USER node
EXPOSE 1161/udp
CMD ["node", "server.mjs"]
