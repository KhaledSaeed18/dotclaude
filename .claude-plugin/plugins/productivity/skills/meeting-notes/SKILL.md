---
name: meeting-notes
description: "Turn a meeting transcript, recording summary, or rough notes into a record people act on: decisions with their reasons, action items with one owner and a date each, open questions, and a short summary, in the team's existing notes format, with nothing invented and unclear attributions marked. Use after a meeting, when a transcript needs to become a shareable record, or when action items from a meeting keep getting lost."
argument-hint: "the transcript or notes (paste or file path); optionally attendees and the meeting's purpose"
---

A meeting record is read by two people: the one who was there and forgot, and the one who was not there and needs to act. Both want the decisions and the actions, not the conversation. Summarise the conversation only as far as it explains a decision.

## Read first

- The whole transcript or notes, once, before extracting anything.
- The previous meeting's record if it exists (same series), to carry over open actions and check which were done.
- The team's notes format, if any (a directory of past notes, a template). Match it exactly; a record in a new format is a record nobody finds.

## Extract

**Decisions**: something the group agreed will happen or be true. Record the decision, who made or confirmed it, the reason given, and any alternative rejected. A decision without a reason gets `[reason not stated]`, not a guessed one.

**Action items**: a verb, one owner (a person, never "the team"), a due date or `[date not set]`. If the transcript assigns nothing, list the action under "Unassigned" rather than picking someone.

**Open questions**: raised and not resolved, with who raised it and what resolving it would need.

**Information shared**: facts stated that others will need (a number, a date, a status), briefly.

Everything else (discussion, tangents, pleasantries) is left out unless it explains a decision.

## Attribution rules

- Attribute only when the transcript makes the speaker clear. Otherwise `[speaker unclear]`.
- Quote exact words only for a decision or a commitment; paraphrase everything else.
- Do not infer agreement from silence; "no objection" is recorded as such.
- Do not soften or sharpen what was said.

## Format (default, when the team has none)

```markdown
# <Meeting name>, 2026-09-21

Attendees: A, B, C. Apologies: D. Notes: (author).

## Summary
Three sentences on what the meeting was for and what came out of it.

## Decisions
1. **Ship the v2 API behind a flag on 1 Oct.** (B) Reason: mobile needs two weeks after the contract freezes. Rejected: shipping unflagged on 25 Sep.

## Action items
| Action | Owner | Due | Status |
| Freeze the v2 contract and publish the OpenAPI diff | A | 2026-09-24 | new |
| (carried over) Fix the flaky checkout test | C | 2026-09-19 | overdue |

## Open questions
- Do we deprecate v1 this quarter? (raised by C; needs the usage numbers B will pull)

## Shared
- Error budget for September is 40% consumed (B).

## Next meeting
2026-09-28; agenda seeds: v1 deprecation decision.
```

## After writing

- List anything in the transcript you could not classify and left out, so the author can check.
- Suggest the record's location and name per the team's convention.
- If asked to send it, draft with `email-draft`; do not send.
- Run `humanize` on the summary.
