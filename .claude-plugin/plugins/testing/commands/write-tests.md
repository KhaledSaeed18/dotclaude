---
name: write-tests
description: Generate a focused, production-quality test suite for a source file, detecting the project's existing test runner and conventions.
argument-hint: "<path/to/source/file> [runner]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(cat:*), Bash(npm:*), Bash(pnpm:*), Bash(yarn:*), Bash(npx:*)
model: inherit
---

## Context

- Target file: `$1`
- Runner override (optional): `$2`
- Project manifest (detect runner, scripts, and deps from here):

!`cat package.json`

## Task

Write a thorough, idiomatic test suite for **`$1`**. If no file path was given in the arguments above, ask for one and stop.

Follow this procedure:

### 1. Detect the toolchain — don't assume

From the manifest above (and config files if needed), determine the runner and libraries already in use. Respect `$2` if the user named a runner; otherwise infer:

- **Runner**: `vitest`, `jest`, `node:test`, `mocha`, `ava`, or `@playwright/test`. Check `devDependencies` and the `test` script.
- **Helpers in play**: `@testing-library/react` + `@testing-library/jest-dom` (React), `supertest` (Express/HTTP), `@nestjs/testing` (NestJS), `msw` (network mocking).
- **Config**: `vitest.config.*`, `jest.config.*`, `tsconfig` paths/aliases, `setupTests` files.

If the project has **no** test runner installed, do not invent one silently: state what you'd add (default to **Vitest** for Vite/Next/library code, **Jest** where it's already the ecosystem norm) and ask before adding a dependency.

### 2. Mirror existing conventions

Find sibling tests with Glob/Grep (`**/*.{test,spec}.{ts,tsx,js,jsx}`) and read one or two. Match their file location (`__tests__/` vs co-located `*.test.ts`), import style, naming, and setup/teardown patterns. New tests should look like they were written by whoever wrote the existing ones.

### 3. Understand the unit under test

Read `$1` in full. Identify every exported function/component/class, its inputs, outputs, side effects, dependencies to mock (network, DB, clock, randomness, filesystem), and the branches that need coverage.

### 4. Write meaningful tests

- **Cover behavior, not implementation.** Assert observable outputs and effects; don't pin internal calls unless the contract is the call itself.
- **Per unit, cover:** the happy path, boundary/edge cases (empty, zero, negative, large, unicode), and error/failure paths (throws, rejections, invalid input).
- **Structure** each test Arrange–Act–Assert with a description that reads as a behavior (`it("returns 401 when the token is missing")`).
- **Determinism is non-negotiable:** fake timers for time, seed or stub randomness, no real network/DB/filesystem — mock at the boundary (`msw`, `supertest`, in-memory fakes). No `sleep`, no ordering assumptions, no shared mutable state between tests.
- **Stack specifics:**
  - **React** (Testing Library): query by role/label/text, never by test-id unless unavoidable; assert what the user sees; use `userEvent` for interaction; wrap async UI in `findBy`/`waitFor`. Don't test internal state.
  - **Express**: drive HTTP with `supertest` against the app instance; assert status, body, and headers; cover auth and validation failures.
  - **NestJS**: build a `Test.createTestingModule`, provide mocked providers, and test services in isolation; for controllers, mock the service layer.
- Keep each test independent and runnable in any order.

### 5. Verify

Run the suite with the detected runner (e.g. `npx vitest run <file>`, `npx jest <file>`) targeting only the new file. Fix failures by correcting the test or the mock — never by weakening an assertion to force a pass. If a test reveals a real bug in `$1`, stop and report it rather than writing the test to expect the buggy behavior.

### 6. Report

State the test file path, the runner used, what scenarios you covered (and any deliberately left out), the pass result, and anything the author should follow up on.
