import { startTelemetry, stopTelemetry } from "./telemetry.js";

await startTelemetry();
await import("./server.js");

const shutdown = async () => {
  await stopTelemetry();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
