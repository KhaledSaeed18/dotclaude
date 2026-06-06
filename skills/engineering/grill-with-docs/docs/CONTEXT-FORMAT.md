# CONTEXT.md format

`CONTEXT.md` is a glossary — it maps each term to a precise, unambiguous definition used across this bounded context. Nothing else belongs here.

## Structure

```markdown
# Glossary

## <Term>

<One-sentence definition. No implementation details.>

**Synonyms:** <term>, <term> — all mean the same thing in this context.
**Contrast with:** <OtherTerm> — <one sentence on the distinction>.
```

## Rules

- **One entry per concept.** If two names refer to the same thing, pick one as canonical and list the others as synonyms.
- **No implementation details.** No class names, no database columns, no framework specifics — only what the concept means in the domain.
- **No architecture notes.** No sequence diagrams, no specs, no ADRs — those belong elsewhere.
- **Contrast when it matters.** If two terms are commonly confused, add a "Contrast with" note to both.
- **Plain language.** Write for a domain expert, not a developer. If the definition requires knowing the tech stack to parse, rewrite it.
