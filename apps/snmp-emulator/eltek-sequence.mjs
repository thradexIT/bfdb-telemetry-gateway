import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { NOTIFICATIONS, trapScenario, sendEltekTrap } from "./eltek-traps.mjs";

export function parseSequence(input) {
  if (
    !input ||
    input.version !== 1 ||
    typeof input.repeat !== "boolean" ||
    !Array.isArray(input.steps) ||
    !input.steps.length ||
    input.steps.length > 1024
  )
    throw new Error("Invalid synthetic sequence");
  const steps = input.steps.flatMap((step) => {
    if (
      !step ||
      !Number.isInteger(step.delayMs) ||
      step.delayMs < 100 ||
      step.delayMs > 3600000
    )
      throw new Error("Invalid synthetic sequence delay");
    const names =
      step.name === "ALL" ? Object.keys(NOTIFICATIONS) : [step.name];
    return names.map((name) => {
      const scenario = { ...step, name };
      trapScenario(scenario); // Validate the entire sequence before any transmission.
      return scenario;
    });
  });
  return { repeat: input.repeat, steps };
}
export async function runSequence(
  config,
  input,
  { signal, onScenario = () => {} } = {},
) {
  const sequence = parseSequence(input);
  let counter = 1;
  do {
    for (const step of sequence.steps) {
      if (signal?.aborted) return;
      await new Promise((resolve) => {
        const done = () => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", done);
          resolve();
        };
        const timer = setTimeout(done, step.delayMs);
        signal?.addEventListener("abort", done, { once: true });
      });
      if (signal?.aborted) return;
      const scenario = { ...step, counter: counter++ };
      onScenario(scenario);
      await sendEltekTrap(config, scenario);
      console.info(
        JSON.stringify({
          event: "synthetic.eltek.sequence.step",
          name: step.name,
          counter: scenario.counter,
        }),
      );
    }
  } while (sequence.repeat && !signal?.aborted);
}
export function sequenceTarget() {
  return {
    host: process.env.SNMP_TRAP_TARGET_HOST || "snmp-traps",
    port: Number(process.env.SNMP_TRAP_TARGET_PORT || 1162),
    version: process.env.SNMP_VERSION || "3",
    username: process.env.SNMP_V3_USERNAME,
    authKey: process.env.SNMP_V3_AUTH_KEY,
    privKey: process.env.SNMP_V3_PRIV_KEY,
    community: process.env.SNMP_COMMUNITY,
    inform: process.env.SNMP_TRAP_INFORM !== "false",
  };
}
export async function loadSequence() {
  if (!process.env.SNMP_SEQUENCE_FILE)
    throw new Error("SNMP_SEQUENCE_FILE required");
  return JSON.parse(await readFile(process.env.SNMP_SEQUENCE_FILE, "utf8"));
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const controller = new AbortController();
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => controller.abort());
  await runSequence(sequenceTarget(), await loadSequence(), {
    signal: controller.signal,
  });
}
