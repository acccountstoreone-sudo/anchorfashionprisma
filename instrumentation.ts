export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamically import Sentry or OpenTelemetry for Node.js edge runtime
    // await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Dynamically import Sentry or OpenTelemetry for Edge runtime
    // await import('./sentry.edge.config');
  }
}
