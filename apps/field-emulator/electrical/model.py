from dataclasses import dataclass
import random

@dataclass
class ElectricalSample:
    voltage_v: float
    current_a: float
    power_w: float
    energy_kwh: float

class CircuitModel:
    def __init__(self, *, seed, nominal_voltage, initial_current, voltage_noise,
                 current_max_step, load_step_probability, load_step_amplitude,
                 current_min, current_max, initial_energy_kwh):
        self.rng=random.Random(seed)
        self.nominal_voltage=nominal_voltage
        self.current_a=initial_current
        self.voltage_noise=voltage_noise
        self.current_max_step=current_max_step
        self.load_step_probability=load_step_probability
        self.load_step_amplitude=load_step_amplitude
        self.current_min=current_min
        self.current_max=current_max
        self.energy_kwh=initial_energy_kwh
        self.last=ElectricalSample(nominal_voltage,initial_current,nominal_voltage*initial_current,initial_energy_kwh)

    def tick(self,elapsed_seconds):
        voltage=self.nominal_voltage+self.rng.uniform(-self.voltage_noise,self.voltage_noise)
        delta=self.rng.uniform(-self.current_max_step,self.current_max_step)
        if self.rng.random()<self.load_step_probability:
            delta+=self.rng.choice((-1.0,1.0))*self.load_step_amplitude
        self.current_a=min(self.current_max,max(self.current_min,self.current_a+delta))
        power=voltage*self.current_a
        self.energy_kwh+=max(power,0.0)*elapsed_seconds/3_600_000.0
        self.last=ElectricalSample(voltage,self.current_a,power,self.energy_kwh)
        return self.last

class ElectricalFleet:
    def __init__(self,config,devices):
        e=config["electrical"]; profiles=config["bfdbProfiles"]; self.models={}
        for di,device in enumerate(devices,start=1):
            profile=profiles[device["bfdbId"]]
            for circuit in range(1,int(e["circuitsPerBfdb"])+1):
                self.models[(device["bfdbId"],circuit)]=CircuitModel(
                    seed=di*100000+circuit,
                    nominal_voltage=float(profile["nominalVoltage"]),
                    initial_current=float(profile["initialCurrentBase"])+(circuit%7)*0.35,
                    voltage_noise=float(e["voltageNoise"]),
                    current_max_step=float(e["currentMaxStep"]),
                    load_step_probability=float(e["loadStepProbability"]),
                    load_step_amplitude=float(e["loadStepAmplitude"]),
                    current_min=float(e["currentMin"]),
                    current_max=float(e["currentMax"]),
                    initial_energy_kwh=0.25+circuit*0.01,
                )
    def tick_all(self,elapsed_seconds):
        for model in self.models.values(): model.tick(elapsed_seconds)
    def get(self,bfdb_id,circuit):
        return self.models[(bfdb_id,circuit)].last
