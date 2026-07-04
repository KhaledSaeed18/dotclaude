---
name: db-migration-safety
description: Review or write a database schema migration with production safety as the bar, checking lock behavior, table rewrites, backfill strategy, deploy-order compatibility (expand-contract), index creation, and rollback, for Postgres, MySQL, and common ORMs' migration tools. Use when adding or reviewing a migration, renaming or dropping columns, adding constraints or indexes to large tables, or planning a backfill.
---

A migration that is correct on an empty dev database can still take a production table offline. Judge every migration by what it does under load on the largest table it touches: what lock it takes, for how long, and what the old application version does while the new schema is live. When any answer is "depends", assume the worst table and the slowest query.

## Step 1: Establish the blast radius

- Read the migration and identify every table it touches, then find out (or ask) roughly how large and how hot each one is. A pattern that is fine on 10k rows is an outage on 100M.
- Identify the engine and version (Postgres, MySQL 8, SQLite, ...) from config; lock behavior differs materially between them, and between versions.
- Identify the deploy model: is the old app version still running while this migration executes (rolling deploy, multiple replicas)? Almost always yes; review under that assumption.

## Step 2: Check the dangerous patterns

Flag any of these, with the safe alternative:

**Locking and rewrites**
- Any statement that rewrites the table or takes an exclusive lock for its duration: changing a column's type, adding a column with a volatile default (pre-Postgres 11), `ALTER TABLE` on MySQL without `ALGORITHM=INPLACE`/`INSTANT` support. Alternative: add a new column, backfill, swap.
- `CREATE INDEX` without `CONCURRENTLY` (Postgres) on a live table blocks writes for the build. `CONCURRENTLY` cannot run inside a transaction; the migration tool must support that (most do via a flag or `disable_ddl_transaction!`).
- Adding a `NOT NULL` constraint or foreign key that validates existing rows scans the table under lock. Alternative: add as `NOT VALID` / unvalidated, then `VALIDATE CONSTRAINT` separately.

**Deploy-order breaks (expand-contract violations)**
- Dropping or renaming a column or table the currently-deployed code still reads or writes. Renames are two deploys minimum: add new + dual-write, migrate readers, then drop the old one in a later release.
- Making a column `NOT NULL` while the running app still inserts without it.
- Enum or check-constraint tightening that existing rows or in-flight writes violate.

**Backfills**
- Backfilling inside the schema migration itself, in one transaction. A backfill is data movement, not schema: run it separately, in batches (thousands of rows per batch, pausing between), idempotent and resumable, keyed on primary-key ranges rather than OFFSET.
- Backfill and constraint in one step; the constraint comes after the backfill completes and is verified.

**Operational**
- No down migration, or a down migration that drops data the up migration created (state whether down is actually safe to run, not just present).
- Long statements without a `lock_timeout`/`statement_timeout` guard (Postgres): a blocked `ALTER` queues behind a long-running query and then blocks everything behind *it*. Set a short lock timeout and retry rather than waiting indefinitely.
- Mixing schema change and unrelated data change in one migration file; they have different risk profiles and rollback stories.

## Step 3: Verify what can be verified

- Run the migration against a local or staging copy and read the SQL the tool actually emits (`--dry-run`, `sqlmigrate`, `db:migrate:status` equivalents); ORMs sometimes generate a rewrite where the model diff looked additive.
- Confirm the migration is wrapped (or deliberately not wrapped) in a transaction as the engine requires.
- For the reviewed-only case (no database available), say so, and mark which findings are static-analysis-certain versus needing a dry run.

## Step 4: Report

Findings ordered by severity: outage risks (locks, rewrites, deploy-order breaks) first, then correctness (rollback, constraint gaps), then hygiene. For each: the statement, what happens on the big table, and the concrete safe sequence, written as actual migration steps in the project's own tool syntax. If the migration is safe as written, say that plainly and note the one or two assumptions the judgment rests on (table size, engine version).
