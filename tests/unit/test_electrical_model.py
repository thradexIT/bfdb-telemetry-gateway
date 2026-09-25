from electrical.model import CircuitModel

def test_power_and_energy():
    m=CircuitModel(seed=1,nominal_voltage=12.23,initial_current=4.0,voltage_noise=.01,current_max_step=.1,load_step_probability=0,load_step_amplitude=0,current_min=0,current_max=14,initial_energy_kwh=1)
    before=m.energy_kwh
    s=m.tick(5)
    assert abs(s.power_w-s.voltage_v*s.current_a)<1e-9
    assert s.energy_kwh>=before
