import { NodeSDK } from "@opentelemetry/sdk-node";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";

let sdk;

export async function startTelemetry() {
  const prometheusPort = Number(process.env.OTEL_METRICS_PORT || 9464);
  const prometheusEndpoint = process.env.OTEL_METRICS_ENDPOINT || "/metrics";

  const metricReader = new PrometheusExporter({
    port: prometheusPort,
    endpoint: prometheusEndpoint,
  });

  sdk = new NodeSDK({
    spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter()),
    metricReader,
  });

  await sdk.start();
  console.log(`OpenTelemetry metrics on http://localhost:${prometheusPort}${prometheusEndpoint}`);
}

export async function stopTelemetry() {
  if (sdk) {
    await sdk.shutdown();
  }
}
