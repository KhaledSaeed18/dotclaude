---
name: incident-postmortem
description: "Write a blameless incident postmortem from the timeline, logs, chat transcripts, and the fix: impact with numbers, a minute-by-minute timeline, root cause as a chain of contributing factors rather than a single culprit, what went well and what did not in detection and response, and action items with owners and dates that address the causes rather than the symptom. Use after an outage, a data incident, a security event, or a near miss, or when an existing postmortem reads as blame or as a fix list."
argument-hint: "(optional) incident id or title, and where the timeline, logs, and chat exports are"
---

A postmortem exists so the same failure cannot happen the same way again. It is blameless because the person who typed the command is never the root cause; the system that let that command do damage is. Write it within a week, while the timeline is still recoverable.

## Gather

- The timeline sources: alerts (first fired), chat channel export, deploy log, commits, dashboards (screenshots with timestamps), customer reports, the incident ticket.
- The fix: the PR or command that resolved it, and when the symptom cleared.
- Metrics for impact: requests failed, users affected, duration, data affected, revenue or SLO budget consumed.

Convert every timestamp to one timezone (UTC) with the local offset stated once.

## Structure

```markdown
# Postmortem: <short title> (INC-1234)

Date of incident: 2026-09-18  |  Duration: 47 min (14:03 to 14:50 UTC)  |  Severity: SEV2
Authors: ...  |  Reviewed: ...  |  Status: action items open (3 of 5)

## Summary
Three sentences: what broke, who it affected and how much, what fixed it.

## Impact
Numbers: error rate, affected users or tenants, failed jobs, data written or lost, SLO budget burned, support tickets. What was NOT affected, if that matters.

## Timeline (UTC)
| Time | Event | Source |
| 13:58 | Deploy of api v2.41.0 starts (rollout 10%) | deploy log |
| 14:03 | Error rate on /orders rises to 12% | alert ORDERS-5XX |
| 14:07 | On-call acknowledges; suspects deploy | #incident |
| ... | ... | ... |
| 14:50 | Error rate back to baseline | dashboard |

## Root cause and contributing factors
The causal chain, from the trigger back through every condition that had to hold:
1. Trigger: v2.41.0 changed the order-status enum; the consumer in billing was not updated.
2. The contract between api and billing has no schema check in CI.
3. Canary at 10% did not include billing traffic, so the canary metrics stayed green.
4. The alert fired on 5xx rate but billing failures surfaced as 200s with an error body.
Each factor is a system property, not a person.

## Detection
How we found out (alert, customer, luck), how long it took, and what would have found it sooner.

## Response
What went well (name it: the rollback took 4 minutes). What was slow or confusing, and why (no runbook for X; two people rolled back different things).

## What we got lucky about
Anything that would have made it worse and did not happen.

## Action items
| # | Action | Addresses factor | Owner | Due | Status |
| 1 | Contract test between api and billing in CI | 2 | ... | 2026-10-02 | open |
| 2 | Canary routing includes billing traffic | 3 | ... | ... | ... |
| 3 | Billing errors return 5xx, alert on them | 4 | ... | ... | ... |

## Lessons
Two or three sentences a reader from another team can apply.
```

## Rules

- **Blameless in language and substance.** Write "the deploy proceeded" not "X deployed without checking". If a human decision is in the chain, the factor is the missing guard that made the decision consequential.
- **Root cause is plural.** A single root cause means the analysis stopped early. Ask "why did that matter?" until the answer is a design property.
- **Action items fix factors, not the symptom.** "Fix the enum" is the incident fix, already done. Each action names the factor it removes; a factor with no action is a documented risk, stated as such.
- **Owners and dates are people and days**, not teams and quarters. Track them; a postmortem whose actions are never done is a ritual.
- **Numbers over adjectives** in impact; if a number is unknown, say unknown and what would have made it knowable (an action item).
- **Reviewed by someone not in the response**, and shared beyond the team.

Run `humanize`; postmortems attract inflated language.
