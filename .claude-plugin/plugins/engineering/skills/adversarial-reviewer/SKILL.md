---
name: adversarial-reviewer
description: Review code through three hostile personas - the Saboteur, the New Hire, and the Security Auditor - each required to find at least one issue. Use when a standard review feels too comfortable, when code is going into a critical path, when a previous review missed bugs that later surfaced, or when you want coverage across correctness, clarity, and security in a single pass.
---

A normal review looks for obvious problems. This review looks with the eyes of someone who wants the code to fail, someone who has never seen it, and someone who is paid to find holes in it. Each persona must report at least one finding. If a persona genuinely cannot find a problem after a thorough examination, that is itself a result - state exactly what was checked and why each candidate turned out safe.

## Before starting

Read the code in full without judging it. Understand what it is trying to do and what invariants it relies on. Only then switch to the adversarial personas, one at a time.

If a diff or specific files are in scope, focus there. If the scope is the current change, also read the surrounding code that the change interacts with.

## Persona 1: The Saboteur

The Saboteur wants the code to fail at runtime. They probe for:

- **Edge cases:** what happens with empty input, zero, negative numbers, very large values, unicode, null, undefined, or a missing key in an object?
- **Sequence and ordering:** what if events arrive out of order? What if two calls happen concurrently? Is there a race between reads and writes?
- **Type coercion and implicit conversion:** does `==` hide a type mismatch? Does a numeric string arrive where a number is expected and gets treated as one?
- **Failure paths:** what happens when a network call fails, a file is missing, a lock times out, or a dependency throws? Are errors swallowed? Does the system end up in a partially-updated state?
- **Off-by-one and boundary arithmetic:** are loop bounds correct? Are slices and ranges inclusive or exclusive where they need to be?

The Saboteur reports findings as: "Saboteur finds: [precise scenario] at [file:line] causes [concrete failure]."

## Persona 2: The New Hire

The New Hire is reading this code for the first time, on their second week. They flag:

- **Naming confusion:** identifiers that mean something different from what they look like, or two things that sound the same but differ in a subtle way.
- **Undocumented assumptions:** preconditions that callers must satisfy but are never stated, state that must be initialized before a function is called, or ordering guarantees that the code depends on but does not enforce.
- **Missing tests for non-obvious behavior:** any path that a reader would not predict from the function's name or signature but that is load-bearing.
- **Why is this here?** Code that does something surprising without explanation. Side effects that are not obvious from the call site.
- **Complexity that could be simpler:** nested conditionals that could be flattened, a loop doing the work of a standard library function, state that is tracked manually when a different data structure would make it automatic.

The New Hire reports findings as: "New Hire finds: [what was confusing or missing] at [file:line] because [what they would have assumed instead]."

## Persona 3: The Security Auditor

The Security Auditor is looking for exploitable weaknesses in this specific code, not a generic checklist. They focus on:

- **Trust boundary violations:** is any user-controlled value used in a query, shell command, file path, or template without explicit validation and sanitization at the boundary?
- **Authorization gaps:** is the caller's identity and permission verified before the operation runs? Can a valid authenticated user access another user's resource by changing an ID?
- **Information leakage:** does an error message, a log line, or a response body expose stack traces, internal paths, user data, or system information to untrusted parties?
- **Insecure defaults:** is a sensitive operation opt-in to security (must be enabled) rather than opt-out (secure by default)? Does a new endpoint inherit the authentication and rate-limiting of the rest of the service, or is it bare?
- **Cryptographic shortcuts:** is a password hashed with anything other than bcrypt, argon2, or scrypt? Is a secret compared with `==` instead of a constant-time function? Is a random token generated with `Math.random()`?
- **Supply chain:** if a new dependency was added, is it maintained, widely used, and necessary? Does it run install scripts that could execute arbitrary code?

The Security Auditor reports findings as: "Security Auditor finds: [vulnerability class] at [file:line]: [attack path and what an adversary gains]."

## Report format

After all three personas have reported, give a consolidated summary:

```
Saboteur: [N findings]
New Hire: [N findings]
Security Auditor: [N findings]

Critical items (address before merge):
- [file:line] - [the finding] - [the fix]

Should-fix items:
- ...

Low / consider items:
- ...
```

If a persona found nothing after thorough checking, list the specific things they checked and confirmed safe - a clean result from a specific check is as useful as a finding.
