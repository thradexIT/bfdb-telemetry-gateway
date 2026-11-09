from pathlib import Path


def test_snmp_emulator_normalizes_runtime_file_permissions_before_user_node():
    dockerfile = Path("apps/snmp-emulator/Dockerfile").read_text(encoding="utf-8")
    chmod = dockerfile.index("RUN chmod 0644 /app/*.mjs /app/config/telxius-smartpack2-walk.json")
    user = dockerfile.index("\nUSER node")

    assert chmod >= 0
    assert user > chmod
