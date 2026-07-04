---
name: performance-optimization
description: Optimize a performance problem by profiling to find the real bottleneck before changing anything, making one targeted change, and verifying both the improvement and that correctness did not degrade. Use when a feature is measurably slow, a page load or API response exceeds a budget, a query is taking too long, or a user reports sluggishness. Do not use to pre-optimize code that has not been measured to be slow.
---

Profile first. Every performance intuition is wrong until the profiler confirms it. The code that looks slow is rarely the bottleneck; the bottleneck is almost always somewhere the code looks unremarkable. An optimization without a measurement is a guess. A guess that happens to speed things up does not mean you found the right thing.

## The one rule

**No change before you have a baseline measurement and a profiled bottleneck.** If you cannot name the specific file, function, and line where the most time or memory is spent - with numbers - you are still in the investigation phase.

## Step 1: Establish the baseline

Define what "slow" means in terms the problem must satisfy:

- What is the current measured value? (response time, frame rate, memory usage, query duration, build time)
- What is the target? (a budget from a spec, a regression from a previous version, a user-reported threshold)
- Can the scenario be reproduced reliably? If not, instrument first and gather data before optimizing.

Run the scenario and record the baseline:

```bash
# For Node.js / server-side
node --prof app.js           # then: node --prof-process isolate-*.log
# or: clinic flame -- node app.js

# For queries
EXPLAIN ANALYZE SELECT ...   # PostgreSQL
# or the equivalent for your database

# For browser / frontend
# Use the browser devtools Performance panel; record the scenario end-to-end
# Look at the flame chart, not just the summary
```

Save the baseline number. The optimization is only valid if the after-measurement is better than this.

## Step 2: Find the bottleneck

Read the profiler output - do not guess from the source. Identify:

- **The hot function:** the one frame where the most CPU time is spent (not called the most - spent the most)
- **The call chain:** how does execution reach the hot function? What is the logical operation that triggers it?
- **The bottleneck class:** is this CPU-bound (computation), memory-bound (allocation/GC pressure), I/O-bound (disk or network latency), lock-bound (contention), or rendering-bound (layout/paint)?

Common bottlenecks that do not look like bottlenecks:

- N+1 queries: a loop that runs one query per item instead of one query for all items
- Serialization on the hot path: `JSON.parse` / `JSON.stringify` inside a tight loop
- Synchronous I/O blocking an event loop
- Repeated computation of a value that never changes within the call
- An O(n^2) algorithm that looks like two nested loops over a "small" list that grew
- Memory allocation creating GC pressure (allocating objects in tight loops, large closures held alive)

## Step 3: Form a hypothesis

State it exactly: "The bottleneck is X at file:line because Y, which will be fixed by Z."

Be specific enough to be falsifiable. "The code is slow because it does too much" is not a hypothesis. "The `getUser` function issues one SQL query per item in the `results` array at `src/db/users.ts:44`, so a page with 50 results makes 50 database round trips; replacing this with a single `WHERE id IN (...)` query should reduce the query time from ~500ms to ~10ms" is a hypothesis.

## Step 4: Make one change

Address only the identified bottleneck. Do not:

- Refactor surrounding code while fixing performance
- Add caching everywhere in case something else is also slow
- Change the algorithm and the data structure at the same time

The change should be the minimum needed to fix the specific bottleneck. Multiple simultaneous changes make the measurement impossible to attribute.

## Step 5: Measure and compare

Run the same scenario under the same conditions as the baseline:

- Record the after measurement using the same tool and methodology
- Calculate the delta: how much faster, how many fewer allocations, what query time
- State whether the target is now met

If the improvement is less than 20% or does not meet the target, re-profile - you may have fixed a symptom, or the bottleneck may have shifted to a new location now that the first one is gone.

## Step 6: Verify correctness

An optimization that breaks behavior is not an optimization - it is a bug. Run the full test suite. If there are no tests covering the modified path, write one before treating the optimization as done.

Check specifically:

- Does the output still match the baseline for all inputs, including edge cases?
- Are any caches invalidated correctly? Does a cache hit return the same result as a cache miss?
- Does the optimized code handle concurrent access correctly if the original did?

## What not to do

- Do not add caching without a cache invalidation strategy.
- Do not replace a correct algorithm with a faster but subtly incorrect one and call it "good enough."
- Do not optimize code that is called rarely - focus on hot paths only.
- Do not report the optimization as complete before running both the performance measurement and the correctness check.
