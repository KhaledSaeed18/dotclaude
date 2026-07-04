---
name: api-design-review
description: Review an API contract (REST or GraphQL) before or while it is implemented, checking resource naming, HTTP semantics, status codes, error shape, pagination, versioning, idempotency, and backward compatibility, and producing concrete revisions rather than abstract advice. Use when designing new endpoints, changing an existing API's surface, or reviewing a PR that adds or modifies API routes.
---

An API contract is the hardest thing in a codebase to change once someone depends on it. Review it as a future consumer under pressure: every inconsistency you let through becomes a permanent workaround in every client. Ground each finding in the project's existing conventions first; consistency with the API a team already ships beats textbook purity.

## Step 1: Establish the existing contract

Before judging anything, learn what this API already does:

- Find the existing routes/resolvers and read three or four representative ones end to end (path, verbs, request/response shapes, error handling).
- Find the conventions: error envelope shape, pagination style, naming case (camelCase vs snake_case), plural vs singular resources, auth mechanism, versioning scheme (path, header, or none).
- Find any OpenAPI/GraphQL schema, API docs, or client SDKs; those are the contract's consumers-eye view.

New surface must match these unless there is a stated reason to diverge, and divergence should be raised as its own finding.

## Step 2: Review the surface

Work through the checklist against each new or changed endpoint. Flag only what is wrong or risky, with the concrete revision.

**Resources and naming**
- Nouns for resources, verbs only via HTTP methods (`POST /orders`, not `POST /createOrder`). Sub-resources for ownership (`/users/{id}/orders`), not query-parameter relationships.
- Consistent casing and pluralization with the rest of the API.

**HTTP semantics**
- GET is safe and cacheable, never mutates. PUT is full replace and idempotent; PATCH is partial. DELETE is idempotent (second call returns the same outcome, 404 or 204, deliberately chosen).
- Status codes carry meaning: 201 + Location for creation, 400 for malformed input vs 422 for valid-but-unprocessable (pick the project's existing convention), 401 unauthenticated vs 403 unauthorized, 409 for conflicts, 429 with Retry-After for rate limits. Never 200 with an error in the body.

**Errors**
- One error envelope everywhere, machine-distinguishable (a stable `code` field, not just prose), with enough detail to act on but no internals (no stack traces, no SQL, no infrastructure hostnames).
- Validation errors name the field that failed.

**Collections**
- Pagination from day one on anything that can grow; cursor-based when ordering is stable and data is written concurrently, offset only for small or static sets. Response includes what the client needs to continue (next cursor / total when affordable).
- Filtering and sorting parameters validated against an allowlist, never passed through to the datastore.

**Change safety**
- Additive changes only within a version: new optional fields are fine; renaming, removing, retyping, or changing the meaning of an existing field is a break and needs a version bump or a deprecation path.
- Unknown fields in requests: decide and document ignore-vs-reject; do not leave it to framework defaults.

**Write safety**
- Mutations that a client might retry (payments, orders, anything POST) accept an idempotency key or are documented as at-most-once.
- Bulk operations define partial-failure behavior explicitly (all-or-nothing, or per-item results).

**GraphQL specifics** (when applicable)
- Nullability is a contract decision, not the schema default. Mutations return payload types with typed user errors, not thrown exceptions. Depth/complexity limits exist for public schemas. Pagination follows the connection pattern already in use.

## Step 3: Report

Order findings by cost-to-fix-later, not by section: contract breaks and irreversible naming first, then semantics, then polish. For each: what, where, why it will hurt, and the exact revised shape (show the corrected route/field/response, not a description of it). Close with anything that should be decided now but deferred deliberately, e.g. rate limiting or versioning strategy, so it is a recorded decision instead of an accident.
