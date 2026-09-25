# Partial Update Contract

Missing != null. Missing != zero. Missing = not updated.

If previous state has V/I/P/E and a later patch contains only `{"state":"ONLINE"}`, the four electrical values remain unchanged.

Explicit `"0.00"` is a real zero and must update the value.

Each field is ordered independently by source timestamp.
