---
name: logging-and-observability
description: "Instrument a service so production problems are diagnosable: structured JSON logs with consistent fields and levels, correlation ids across requests and jobs, the RED and USE metrics, distributed tracing with OpenTelemetry, health and readiness endpoints, alerts on symptoms with runbooks, and dashboards per service; with the setup for Node, Python, and Go and the cost and privacy rules that keep it sustainable. Use when a service goes to production, when an incident could not be traced, when logs are noisy or expensive, or when alerts fire without meaning."
argument-hint: "(optional) the service, the stack, and the observability backend"
---

Observability is the ability to ask a new question about the system's behaviour without shipping new code. Logs, metrics, and traces each answer different questions; a service needs all three, wired so that one request can be followed across them.

## Logs

- **Structured** (JSON, one object per line) to stdout; the platform ships them. Never format strings for humans in production logs; dashboards and queries need fields.
- **Standard fields on every line**: `timestamp` (ISO 8601 UTC), `level`, `message`, `service`, `version`, `env`, `request_id` or `trace_id`, and the domain ids in play (`user_id`, `order_id`). A logger bound with context (`logger.child({ requestId })`) so handlers do not repeat them.
- **Levels**: `error` for failures needing attention (paged or triaged), `warn` for degraded but handled, `info` for business events and request summaries (one line per request with method, path, status, duration), `debug` off in production. A log at `error` that nobody would act on is noise that hides the one that matters.
- **One request summary line** at the boundary rather than a line per step; steps at `debug`.
- **Never log**: secrets, tokens, passwords, full card numbers, full request bodies, personal data beyond the ids needed. Redaction in the logger config (pino `redact`, structlog processors), not by remembering.
- **Sampling** for high-volume `info` and for `debug` in production when needed; errors are never sampled.
- **Retention and cost**: logs cost by volume; a noisy dependency at `info` can be the largest line item. Budget per service and review monthly.

Libraries: `pino` (Node), `structlog` or `logging` with a JSON formatter (Python), `slog` (Go), `tracing` (Rust).

## Correlation

- A `request_id` accepted from the inbound header (`X-Request-Id`, or the W3C `traceparent`) or generated at the edge, put on the logger context and the response header, and forwarded on every outbound call and every enqueued job. A job carries the id of the request that created it.
- With tracing enabled, the trace id serves as the correlation id; log it on every line.

## Metrics

- **RED per endpoint or operation**: Rate (requests/s), Errors (by class), Duration (histogram; p50, p95, p99). This is the dashboard's first row.
- **USE per resource**: Utilisation, Saturation, Errors for CPU, memory, connections, queues, thread pools.
- **Business metrics**: orders created, payments failed, jobs processed, by outcome. These make the "is it working" question answerable from a graph.
- Histograms for durations (never averages alone); counters with a small, bounded set of labels (no user ids as labels; cardinality is cost and outages).
- Expose via OpenTelemetry metrics or Prometheus client (`/metrics`), scraped or pushed per platform.

## Traces

- OpenTelemetry SDK with auto-instrumentation for the HTTP server, HTTP client, DB driver, queue client; manual spans around the domain operations that matter (`checkout.reserve_inventory`) with attributes (ids, sizes, outcomes).
- Propagate context (`traceparent`) across services and through queues (inject on publish, extract on consume).
- Sample: head-based at a fixed rate (1 to 10%) plus tail-based or always-on for errors and slow requests where the backend supports it.
- Record exceptions on spans; set span status on failure.

## Health

- `/health/live`: process is up (no dependencies). Used for restarts.
- `/health/ready`: the service can serve (DB reachable, migrations applied, caches warm). Used for routing traffic. Failing ready during shutdown drains connections cleanly.
- Both cheap, unauthenticated inside the network, and not logged at `info`.

## Alerts

- Alert on **symptoms** users feel (error rate above SLO burn, p95 latency, queue lag, job failures), not on causes (CPU 80%). Cause metrics belong on dashboards.
- Every alert has a **runbook** link: what it means, how to confirm, the first three things to check, how to mitigate, who to escalate to.
- Severity matches action: page for user-facing impact now; ticket for degradation that can wait until morning. An alert that fires and is ignored gets deleted or fixed that week.
- Multi-window burn-rate alerts for SLOs (fast burn pages, slow burn tickets).

## Dashboards

One per service, same layout everywhere: RED row, dependencies row (latency and errors per downstream), resources row (USE), business row, deploy markers overlaid. Link from the alert to the dashboard to the traces.

## Setup sketches

- **Node**: `pino` + `pino-http` for the request line; `@opentelemetry/sdk-node` with `auto-instrumentations-node`; `prom-client` or the OTel metrics exporter.
- **Python**: `structlog` with JSON renderer and `contextvars` binding; `opentelemetry-instrumentation-fastapi`/`-django`, `-requests`, `-sqlalchemy`; `prometheus_client`.
- **Go**: `log/slog` with a JSON handler and `context` propagation; `go.opentelemetry.io/otel` with `otelhttp`, `otelsql`; `prometheus/client_golang`.

## Review checklist

JSON logs with the standard fields; one request line; secrets redacted in config; correlation id in, out, and forwarded; RED metrics per endpoint; histograms for latency; traces propagated through HTTP and queues; live and ready endpoints; alerts on symptoms with runbooks; dashboard exists; log volume budgeted.
