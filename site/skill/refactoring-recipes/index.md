---
name: refactoring-recipes
description: "Refactor safely by name: a catalogue of the refactorings that come up in practice (extract function or module, inline, rename, replace conditional with polymorphism or lookup, introduce parameter object, replace flag argument, split phase, move function, encapsulate collection, strangler for large rewrites), each with when to apply it, the mechanical steps that keep the code working at every step, and the test to run between steps. Use when code is hard to change, before adding a feature to a tangled area, or when a reviewer asks for a structure change without saying how."
argument-hint: "(optional) the code to refactor and the smell or goal"
---

A refactoring changes structure without changing behaviour, in steps small enough that the tests pass after each one. If you cannot run tests between steps, the first refactoring is to make the code testable. If you are changing behaviour, that is a feature or a fix; do not mix it with refactoring in the same commit.

## Before any refactoring

1. **Tests exist and pass.** Characterisation tests for legacy code: capture current outputs for representative inputs before touching anything.
2. **Scope is named.** The smell you are removing and the boundary you will not cross.
3. **Commit is clean.** Refactor on its own commit(s) so a reviewer can verify "no behaviour change" by reading the diff.

## Recipes

**Extract function.** When a block does one nameable thing inside a longer function, or the same block appears twice. Steps: name the function after what it does; copy the block; identify inputs (parameters) and outputs (return); replace the block with a call; run tests. Watch for variables assigned in the block and read after it (return them, or split the extraction).

**Inline function.** When a function's body is as clear as its name and it has one caller, or the indirection hides what happens. Steps: check it is not overridden; replace each call with the body; remove the function; run tests.

**Rename.** When a name lies or is vague. Steps: use the IDE or language-server rename for symbols; for strings and config keys, grep all occurrences including docs and tests; rename in one commit. Keep the old name as a deprecated alias when it is public API, with a removal date.

**Extract module or class.** When a file has two reasons to change, or one group of functions shares state the others do not touch. Steps: move the cohesive functions and their state; leave re-exports at the old location temporarily; update imports; run tests; remove re-exports when no caller remains.

**Move function.** When a function uses another module's data more than its own. Steps: copy to the target; make the original delegate; move callers one by one; delete the original.

**Replace conditional with lookup.** When a `switch` or if-chain maps a value to a value. Steps: build the table (object, Map, dict); replace the conditional with a lookup and an explicit default; run tests. Keep exhaustiveness (a `never` check or an assertion on the default).

**Replace conditional with polymorphism.** When the same `switch` on a type appears in several functions. Steps: introduce a type per case with the shared interface; move each branch's body to its type; replace the switch with a method call; run tests after each case moves. Do not apply for a single switch; the lookup is enough.

**Introduce parameter object.** When several functions take the same three or four parameters together. Steps: define the type; add it as a new parameter while keeping the old ones; migrate callers; remove the old parameters.

**Replace flag argument.** When a boolean parameter selects between two behaviours. Steps: create one function per behaviour with the shared part extracted; migrate callers by the literal they pass; remove the flag.

**Split phase.** When a function reads input, computes, and writes output interleaved. Steps: extract the compute into a pure function taking plain data; the outer function becomes read, call, write; test the pure function directly.

**Encapsulate collection.** When callers mutate an exposed array or map. Steps: return a copy or readonly view; add add/remove methods; migrate callers; make the field private.

**Replace magic value.** When a literal carries meaning. Steps: named constant next to its first use, or an enum when it is one of a set; replace occurrences; run tests.

**Decompose conditional.** When a condition needs a comment. Steps: extract the condition into a predicate named after its meaning; extract each branch if long.

**Introduce guard clauses.** When the happy path is nested in else branches. Steps: invert each condition and return early; flatten; run tests. Stop when the main path reads top to bottom.

**Strangler for large rewrites.** When a module is too broken to refactor in place. Steps: put a facade in front of it; route one behaviour at a time to the new implementation behind the facade, with the old one as fallback and a comparison log; when all behaviours are routed and comparisons agree, delete the old module. Never a big-bang rewrite.

## Between steps

Run the narrowest test that covers the change, then the module's tests, then the full suite before committing. If a step breaks a test and the fix is not obvious in one minute, revert the step and take a smaller one.

## Reporting

For each refactoring: the smell, the recipe, the files, and the test run. If a refactoring exposed a bug, fix it in a separate commit with its own test and say so; a refactoring commit must be behaviour-neutral. Hand the result to `code-simplifier` for a final pass if the diff is large.

## Source

Recipe names follow Martin Fowler's catalogue (Refactoring, 2nd edition); the steps and ordering here are this repository's summary.
