from normalizer.telemetry import normalize_patch

FIELDS={"voltage":"U1","current":"I1","power":"P1","energy":"EP1"}

def test_missing_field_is_not_synthesized():
    p=normalize_patch({"state":"ONLINE","U1":"12.23"},FIELDS)
    assert p=={"state":"ONLINE","voltage":12.23}
    assert "current" not in p

def test_explicit_zero_is_zero():
    p=normalize_patch({"I1":"0.00"},FIELDS)
    assert p["current"]==0.0
