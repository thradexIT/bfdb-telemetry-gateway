import pytest

from history_api import WINDOWS, parse_history_query


def test_history_query_defaults_to_24h():
    query = parse_history_query("/history?serial=EMU-BFDB-03")
    assert query == {
        "serial": "EMU-BFDB-03",
        "window": "24h",
        "raw_point_ids": [],
    }


def test_history_query_accepts_repeated_raw_point_filters():
    query = parse_history_query(
        "/history?serial=EMU-BFDB-03&window=7d&rawPointId=0_1_1&rawPointId=0_1_2"
    )
    assert query["window"] == "7d"
    assert query["raw_point_ids"] == ["0_1_1", "0_1_2"]


@pytest.mark.parametrize("window", WINDOWS)
def test_supported_windows(window):
    query = parse_history_query(f"/history?serial=EMU-BFDB-03&window={window}")
    assert query["window"] == window


def test_history_query_rejects_missing_serial():
    with pytest.raises(ValueError, match="serial is required"):
        parse_history_query("/history?window=24h")


def test_history_query_rejects_unknown_window():
    with pytest.raises(ValueError, match="unsupported window"):
        parse_history_query("/history?serial=EMU-BFDB-03&window=90d")
