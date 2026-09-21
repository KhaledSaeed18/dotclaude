---
name: research-methodology
description: "Choose and justify a research design for each research question: controlled experiment, quasi-experiment, case study, survey, interview study, design science, action research, or mixed methods, with the data collection, sampling, analysis, ethics, and validity threats each entails, and write the method chapter's design section from the choice. Use when moving from research questions to a study plan, when a supervisor asks how the question will be answered, or when reviewers say the method cannot support the claims."
argument-hint: "(optional) the research question record or the questions to design for"
---

The method exists to answer the question; it is chosen after the question and before the data. A method chosen for familiarity or convenience produces a thesis whose conclusions the examiner cannot accept. This skill matches each research question to a design and writes down why.

## Match question type to design

| Question asks | Design | Evidence produced |
| --- | --- | --- |
| Does X cause Y? / Is A better than B? | controlled experiment (randomised, with baselines) | effect size with confidence, under controlled conditions |
| Does X cause Y in a real setting where randomisation is impossible? | quasi-experiment (pre/post, difference-in-differences, matched groups) | effect estimate with stated confounds |
| How and why does X happen in context? | case study (single or multiple, embedded) | rich description, mechanisms, propositions |
| How prevalent is X? What do people think or do? | survey (questionnaire) | distributions, correlations, at scale |
| What is the lived experience or reasoning behind X? | interview study, focus groups, observation | themes, categories (thematic analysis, grounded theory) |
| How can we build an artifact that solves X, and does it? | design science (build and evaluate) | artifact plus evaluation against requirements |
| How can we improve practice X while studying it? | action research | cycles of change and reflection |
| What does the literature say about X? | systematic review or mapping study | synthesis with explicit protocol (`systematic-review`) |
| Does the finding hold across settings? | replication | confirmation or boundary conditions |

Most master's theses in computing combine two: a design-science build with an experimental evaluation, or a survey followed by interviews (explanatory sequential mixed methods). Name the combination and the order.

## For each design, decide and write down

**Participants, subjects, or objects**: population, sampling (random, stratified, convenience with its limitation stated, purposive for interviews), sample size with the reason (power analysis for experiments via `statistics-advisor`; saturation for interviews; the whole population for a census of repositories).

**Variables**: independent (manipulated), dependent (measured), controlled, and the confounds you cannot control. Operationalise each: "usability" becomes SUS score and task completion time.

**Procedure**: step by step, with timing, instruments (questionnaires, tasks, scripts), and the exact conditions. A reader should be able to run it.

**Instruments**: validated where they exist (SUS, NASA-TLX, TAM); if you write your own, pilot it and say so.

**Data**: what is collected, in what format, where stored, retention, anonymisation.

**Analysis plan**, decided before data collection: the statistical tests (`statistics-advisor`) or the qualitative coding approach, the significance level, the effect size measure, how missing data is handled. Pre-register it in the proposal; deviations are reported as such.

**Ethics**: informed consent, approval body and reference, data protection, the right to withdraw. Studies of open-source repositories still raise questions (developer names in data).

**Validity threats**, using the standard four and what you did about each:

- Construct: does the measure capture the concept? (SUS measures perceived usability, not efficiency.)
- Internal: could something other than X explain Y? (learning effects, order effects, selection)
- External: to whom and what do the results generalise? (students are not professionals; one language is not all)
- Conclusion: is the statistical reasoning sound? (power, multiple comparisons, assumptions)

For qualitative work use credibility, transferability, dependability, confirmability, and the tactics (triangulation, member checking, audit trail).

## Output

A design section for the method chapter, per research question:

```
### RQ2: Does feedback style affect fix time?

Design: between-subjects controlled experiment, two conditions (rule-based, LLM-based), random assignment.
Participants: 40 second-year students (power analysis: d = 0.8, alpha 0.05, power 0.8 gives 26 per group; 40 allows attrition), recruited via course announcement (convenience; see External validity).
Variables: IV feedback style; DV time to correct fix (seconds, from logs), secondary DV SUS; controlled: assignment, IDE, time limit.
Procedure: consent; 5-minute tutorial; three tasks in fixed order; SUS; debrief. 45 minutes.
Analysis: Welch's t-test on log-transformed time; Cohen's d; Mann-Whitney U as robustness check; alpha 0.05.
Ethics: approved by <board>, ref <n>; data pseudonymised at collection.
Threats: internal, task order fixed (mitigated by counterbalancing tasks 2 and 3); external, students; construct, fix time measures speed not learning.
```

Write it to the method chapter file or return it; then update `research/QUESTION.md` with the design per question so `thesis-proposal` and `thesis-reviewer` see the same plan.
