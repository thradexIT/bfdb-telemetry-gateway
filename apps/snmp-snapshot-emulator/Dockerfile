FROM python:3.12-slim
WORKDIR /app
COPY apps/snmp-snapshot-emulator/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --system --uid 10001 --create-home snmpsim
COPY apps/snmp-snapshot-emulator/build_snapshot.py /app/build_snapshot.py
COPY apps/snmp-snapshot-emulator/entrypoint.sh /app/entrypoint.sh
RUN chmod 0555 /app/entrypoint.sh /app/build_snapshot.py
EXPOSE 1161/udp
ENTRYPOINT ["/app/entrypoint.sh"]
