---
name: openapi-spec
description: "Write, generate, or review an OpenAPI 3.1 specification for an HTTP API so that it is accurate to the implementation, complete for consumers (schemas, examples, errors, auth, pagination), and usable by tooling (validation, client generation, mock servers). Covers design-first and code-first workflows, linting with Spectral, and keeping the spec in sync in CI. Use when documenting an API, when a client generator or contract test needs a spec, or when the existing spec no longer matches the routes."
argument-hint: "(optional) the routes or handlers directory, the existing spec, or the framework"
---

An OpenAPI document is a contract. It is worth having only if it is true, so the first question is always how it stays in sync with the code: generated from annotations or types (code-first), or validated against the implementation in CI (design-first). Pick one and make the check mechanical.

## Workflow

**Code-first** (existing API, typed framework): generate from the source of truth. NestJS (`@nestjs/swagger` decorators), FastAPI (automatic from Pydantic models), Spring (springdoc), Go (`swag`, or `huma`/`oapi-codegen` design-first), Express or Hono with zod (`zod-openapi`, `@asteasolutions/zod-to-openapi`). Commit the generated file and diff it in CI so an undocumented route change fails the build.

**Design-first** (new API, multiple implementers): write `openapi.yaml` by hand, generate server stubs and clients from it, and add a contract test (Prism mock or Dredd/Schemathesis against the running server) so the implementation cannot drift.

Either way: `spectral lint openapi.yaml` in CI with the `spectral:oas` ruleset plus house rules.

## What a complete spec has

- `info` with a real description, version (semver, bumped with breaking changes), contact.
- `servers` for each environment, with variables for the base URL.
- `securitySchemes` (bearer JWT, API key header, OAuth2 flows) and a top-level `security` default, overridden per operation where public.
- Every operation: `operationId` (unique, verbNoun, used as the client method name), `summary` (one line), `description` (when behaviour needs it), `tags` (one per resource), parameters with types, formats, constraints, and examples, request body with schema and example, every response the server can send (200/201/204, 400, 401, 403, 404, 409, 422, 429, 500) with a schema.
- One error schema used everywhere (RFC 9457 problem details: `type`, `title`, `status`, `detail`, `instance`, plus `errors[]` for validation).
- Pagination described once (cursor or page/limit) as reusable parameters and a response envelope schema.
- Schemas in `components/schemas` with `required`, `nullable` (3.1: `type: [string, "null"]`), `enum`, `format` (`date-time`, `uuid`, `email`, `uri`), `minimum`/`maxLength`, `readOnly` for server-set fields, `example` or `examples` on each.
- `deprecated: true` with a `description` saying the replacement and the removal date.

## Design rules that show up in the spec

- Resource nouns, plural, kebab-case paths: `/api/v1/order-items/{orderItemId}`.
- Ids as opaque strings (`format: uuid` when true); never expose sequential integers unless they are the public key.
- Filtering, sorting, and field selection as query parameters with documented syntax.
- Idempotency: `PUT` and `DELETE` idempotent by definition; `POST` creates take an `Idempotency-Key` header when retries are expected.
- Versioning in the path or an `Accept` header, one scheme, stated in `info.description`.
- Timestamps ISO 8601 UTC; money as integer minor units plus a currency code, never floats.

## Reviewing an existing spec

1. List the routes the code actually serves (framework route table, `grep` for the router) and diff against `paths`. Undocumented and phantom routes are the first findings.
2. For each operation, call it (or read the handler) and compare the real response shape and status codes with the spec.
3. Run `spectral lint`; fix errors, evaluate warnings.
4. Check examples validate against their schemas (`openapi-examples-validator` or Spectral's `oas3-valid-media-example`).
5. Generate a client (`openapi-generator-cli`, `openapi-typescript`) and read the output; awkward names reveal missing `operationId`s and inline schemas that should be components.

## Minimal skeleton

```yaml
openapi: 3.1.0
info: { title: Orders API, version: 1.2.0, description: ... }
servers: [{ url: https://api.example.com/v1 }]
security: [{ bearerAuth: [] }]
tags: [{ name: orders }]
paths:
  /orders:
    get:
      operationId: listOrders
      summary: List orders
      tags: [orders]
      parameters: [{ $ref: '#/components/parameters/Cursor' }, { $ref: '#/components/parameters/Limit' }]
      responses:
        '200': { description: A page of orders, content: { application/json: { schema: { $ref: '#/components/schemas/OrderPage' } } } }
        '401': { $ref: '#/components/responses/Unauthorized' }
components:
  securitySchemes: { bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT } }
  parameters: ...
  responses: ...
  schemas: ...
```

Keep the file split with `$ref` to `components/` files once it passes a thousand lines, and bundle for publishing (`redocly bundle`).
