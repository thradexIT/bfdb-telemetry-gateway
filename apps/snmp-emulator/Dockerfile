FROM node:22.16.0-alpine
WORKDIR /app
COPY apps/snmp-emulator/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY apps/snmp-emulator/*.mjs ./
USER node
EXPOSE 1161/udp
CMD ["node", "server.mjs"]
