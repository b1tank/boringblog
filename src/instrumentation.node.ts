import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

const connectionString =
  process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

if (connectionString) {
  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString,
    },
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "boringblog",
    }),
    instrumentationOptions: {
      http: { enabled: true },
      azureSdk: { enabled: true },
    },
    samplingRatio: 1,
    enableLiveMetrics: true,
    enableStandardMetrics: true,
  });
} else {
  console.warn(
    "[otel] APPLICATIONINSIGHTS_CONNECTION_STRING not set — telemetry disabled"
  );
}
