def encode_panelized_point_id(circuit_id: int, positions_per_panel: int = 24) -> str:
    """Map a 1-based logical circuit to a panelized MQTT point id.

    Circuit 1..24   -> 0_1_1 .. 0_1_24
    Circuit 25..48  -> 0_2_1 .. 0_2_24
    Circuit 49..72  -> 0_3_1 .. 0_3_24
    Circuit 73..96  -> 0_4_1 .. 0_4_24

    The panel index is synthetic for the emulator. In real field data, the
    mapping of group 3/4 (or another namespace) to frame B remains evidence-TBD.
    """
    circuit_id = int(circuit_id)
    positions_per_panel = int(positions_per_panel)
    if positions_per_panel <= 0:
        raise ValueError("positions_per_panel must be positive")
    if circuit_id <= 0:
        raise ValueError("circuit_id must be positive")

    panel_index = ((circuit_id - 1) // positions_per_panel) + 1
    position = ((circuit_id - 1) % positions_per_panel) + 1
    return f"0_{panel_index}_{position}"
