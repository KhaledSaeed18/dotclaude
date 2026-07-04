---
name: solid-principles
description: Apply the SOLID principles as design diagnostics when writing, reviewing, or refactoring code with classes, modules, or service boundaries - detecting god classes, fragile hierarchies, fat interfaces, and hard-wired dependencies, and prescribing the smallest structural fix. Treats SOLID as a smell detector, not a ceremony to impose. Use when designing a new module or class, reviewing object-oriented code, untangling a class that keeps changing for unrelated reasons, or deciding where an abstraction belongs.
---

Use SOLID to diagnose, not to decorate. Each principle names a specific way designs rot under change; the skill is recognizing the rot early and making the smallest cut that stops it. The failure mode of SOLID is applying it as ceremony - an interface for every class, a factory for every constructor - which produces the same unmaintainability it was meant to prevent, with more files. Every abstraction this skill recommends must be justified by a change pressure that actually exists in this codebase, not one imagined.

## Step 1: Find the change pressure

Before judging any structure, learn what actually changes here:

- `git log --oneline --follow` on the files in question: what has forced edits, and do unrelated reasons keep touching the same file?
- Where have bugs clustered? A class that breaks every time a neighbour changes is telling you where the coupling is.
- What does the team add regularly (new payment providers, new report types, new integrations)? That axis deserves an extension point; axes that never vary do not.

SOLID violations only matter along axes that change. A "god class" that has been stable for two years is a lower priority than a small class edited weekly by three features.

## Step 2: Diagnose against each principle

For each, the smell, the test, and the minimal fix - in the codebase's own idiom (modules and functions count; none of this requires classes).

**S - Single responsibility.** A unit should have one reason to change.
- *Smell:* commits touch the same file for unrelated features; the class name contains "Manager", "Handler", "Util"; you describe it with "and".
- *Test:* list the actors/features that force edits to it. More than one - it is doing more than one job.
- *Fix:* split along the reasons-to-change, not along method count. Ten cohesive methods are fine; three methods serving three features are not.

**O - Open/closed.** Add behaviour by adding code, not by editing a growing conditional.
- *Smell:* a switch/if-else chain over a type tag that grows a branch with every new variant, duplicated in several places.
- *Test:* "when the next variant arrives, how many existing files change?" More than one is the smell; zero or one (plus the new variant file) is the goal.
- *Fix:* one extension point - a strategy map, a handler registry, polymorphism - introduced at the second or third variant, not speculatively at the first.

**L - Liskov substitution.** A subtype must be usable wherever its base is expected, without surprises.
- *Smell:* overrides that throw `NotImplemented`, no-op overrides, `instanceof` checks on the subtype after receiving the base, subclasses that tighten what inputs they accept.
- *Test:* can every caller of the base run unmodified against each subtype and stay correct?
- *Fix:* usually the hierarchy is wrong - replace inheritance with composition, or split the base into what all subtypes truly share. (A `Square extends Rectangle` problem is never fixed inside `Square`.)

**I - Interface segregation.** Depend on the methods you use, not on a fat contract.
- *Smell:* implementations stubbing methods they do not need; a change to one client's method recompiling/breaking every other client; mocks that stub fifteen methods to test one.
- *Test:* group the interface's methods by which clients call them. More than one group - the interface is a bundle.
- *Fix:* split by client need (`Reader`/`Writer`, not `Storage`), or in structurally-typed languages, accept the narrow shape the function actually uses.

**D - Dependency inversion.** Policy should not import mechanism.
- *Smell:* business logic constructing its own database client or HTTP client inline; tests that cannot run without real infrastructure; a domain module importing a vendor SDK.
- *Test:* can the core logic be exercised in a test with in-memory fakes, without patching module internals?
- *Fix:* pass the dependency in (constructor, parameter, factory) behind the narrowest interface the logic needs. Plain function parameters count as injection; a DI framework is not the point.

## Step 3: Prescribe proportionately

- Order findings by cost of leaving them: violations on hot, frequently-edited paths first; stable code last or not at all.
- Each finding names the principle, the concrete evidence (file, the commits or branches that show the pressure), and the smallest refactor - shown as the target structure in the project's own style, not a pattern name.
- Say what you would *not* change. Explicitly bless the simple code that hypothetically "violates" a principle but sits on an axis with no change pressure. Recommending restraint is part of the review.
- When writing new code rather than reviewing: start concrete, and let the second variant or second consumer trigger the abstraction. Note in the design where that extension point will go when it is earned.
