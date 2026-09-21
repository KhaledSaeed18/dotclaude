---
name: error-handling-patterns
description: "Design and review error handling in a codebase: which errors are expected results versus bugs, typed error hierarchies or result types, where to catch (boundaries) and where never to, preserving cause chains, mapping errors to HTTP and CLI exit codes, retries with backoff for the transient, timeouts everywhere, and the logging that makes a failure diagnosable; with idioms for TypeScript, Python, Go, and Rust. Use when adding error handling to new code, when a codebase has inconsistent or swallowed errors, or when a failure in production was impossible to trace."
argument-hint: "(optional) the module or the failure to design for"
---

Error handling has one purpose: when something goes wrong, the right party finds out, with enough context to act, and the system stays in a known state. Every pattern below is judged by that.

## First decision: expected outcome or bug?

- **Expected outcomes** (not found, validation failed, permission denied, rate limited, conflict) are part of the function's contract. Represent them in the type: a result type, a discriminated union, a documented typed error. Callers handle them.
- **Bugs and infrastructure failures** (null where impossible, invariant broken, database down, out of memory) are exceptions. They propagate to a boundary that logs them and fails the operation; code in between does not catch them.

Mixing the two (throwing for "not found", or returning null for "database down") produces both noisy logs and silent failures.

## Represent errors with types

- Base error class per domain (`AppError` with `code`, `httpStatus`, `isOperational`), subclasses for categories (`NotFoundError`, `ValidationError`, `ConflictError`, `UpstreamError`). One place maps code to status and to user message.
- Or a result type (`Result<T, E>` / `Either`) for expected outcomes in functional codebases; then errors are values, exhaustively matched, and never forgotten. Do not use both styles in one module.
- Errors carry structured context: the ids involved, the operation, the upstream status. Not the user's secrets, not whole request bodies.

## Where to catch

Catch at **boundaries**: the HTTP handler, the CLI entry, the job runner, the message consumer, the top of a background task. There, translate to the boundary's vocabulary (status code, exit code, ack/nack), log once with full context, and stop.

In between, catch only to **add context and rethrow** (`throw new UpstreamError("payments: charge failed", { cause: err, orderId })`) or to **handle an expected outcome** you can actually resolve (retry, fallback with a documented consequence, default that is semantically correct).

Never: empty catch, catch-and-log-and-continue in the middle of a flow, catch of a broad type when a narrow one was meant, catch to return a sentinel that callers do not check.

## Preserve the chain

- `new Error(msg, { cause })` in JS; `raise ... from err` in Python; `fmt.Errorf("...: %w", err)` in Go; `#[source]`/`thiserror` in Rust. The boundary logs the whole chain.
- Never convert an error to a string before it reaches the logger; never replace it with a generic one.

## Boundaries

**HTTP**: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 422 semantic, 429 rate limit, 500 unexpected (never leak the message), 502/503/504 upstream. One error response shape (RFC 9457 problem details). A 200 with `{ error }` in the body is a bug.

**CLI**: exit 0 success, 1 general failure, 2 usage error, others per convention; message to stderr, machine output to stdout; `--verbose` for the chain.

**Jobs and consumers**: distinguish retryable (nack with delay, bounded attempts, then dead-letter with the error attached) from poison (dead-letter immediately). Idempotent handlers so retries are safe.

**Background tasks and event handlers**: an unhandled rejection in a fire-and-forget task must still reach the logger and the process's error metric; wrap the entry in a handler.

## Transient failures

- Timeouts on every outbound call (HTTP, DB, queue), shorter than the caller's own timeout. A missing timeout is an error that presents as a hang.
- Retry only idempotent operations and only for transient classes (connection reset, 503, 429 with `Retry-After`), with exponential backoff and jitter, a small maximum (3), and a total budget. Log each retry at debug, the final failure at error.
- Circuit breaker when a dependency is failing at volume, so the system degrades instead of piling up timeouts.
- Fallbacks must be documented consequences: "serve cached price, flag stale" is a fallback; "return 0" is a silent failure.

## Logging

Log once, at the boundary, at error level, with: the error class and message, the chain, the operation, the ids, the correlation/request id, and duration. Log expected outcomes (404, validation) at info or not at all; they are not incidents. Never log secrets, tokens, or full bodies. Count errors by class in a metric so a spike is visible.

## Language idioms

- **TypeScript**: `catch (err: unknown)` then narrow (`err instanceof AppError`); `Promise.allSettled` when partial failure is acceptable, `Promise.all` when one failure should fail all; no floating promises (`await` or `void` with a handler); `AbortSignal.timeout(ms)` for fetch.
- **Python**: catch specific exceptions, never bare `except:`; `raise ... from`; `contextlib` for cleanup; `asyncio.timeout()`; `logging.exception()` at the boundary.
- **Go**: return errors, wrap with `%w`, check with `errors.Is`/`errors.As`; sentinel errors for expected outcomes; `context.WithTimeout` on every call; never ignore a returned error (`_ =` needs a comment).
- **Rust**: `Result` everywhere, `?` to propagate, `thiserror` for library errors, `anyhow` at binaries; `expect` only for invariants with a message that says why it cannot fail.

## Review checklist

Every catch either rethrows with context, handles an expected outcome, or is at a boundary. No error is stringified early. Every outbound call has a timeout. Retries are bounded and idempotent. Boundaries return the right status. Logs at the boundary carry the chain and the ids. Tests cover each expected outcome and at least one unexpected failure path (`test-gap-analyzer` will check).
