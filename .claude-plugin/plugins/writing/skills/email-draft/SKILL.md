---
name: email-draft
description: "Draft an email or message that gets the reply it needs: purpose in the first line, the ask made explicit with a date, context kept to what the reader needs, one request per message, a subject line that says the content, and a register matched to the relationship (supervisor, colleague, maintainer, support, recruiter). Never sends. Use when writing to a supervisor, a maintainer, a reviewer, a vendor, or a team, when a message is not getting answered, or when a difficult message needs the right tone."
argument-hint: "who it is to, what you need from them, and the relevant facts; optionally a previous message to reply to"
---

The reader decides in the first two lines whether to act now, later, or never. Put the purpose and the ask there, make the ask easy to say yes to, and stop when the reader has what they need.

## Before drafting

- Who is the reader, what do they already know, and what is their relationship to you (they owe you a reply, you are asking a favour, you are reporting up).
- What do you need: a decision, information, an action, an introduction, or nothing (an FYI). If more than one, split into separate messages or make one the ask and the rest optional.
- What would make the reply easy: a yes/no question, options with a recommendation, a date, a link to the thing.

## Structure

```
Subject: <the content, specific>  e.g. "Ethics form signature needed by Thu 25 Sep"

<Greeting matching the relationship>

<Line 1: why you are writing, in one sentence.>
<Line 2: the ask, with the date or the options.>

<Context: two to five sentences, only what the reader needs to decide. Numbers, links, attachments named.>

<Close: what happens next, thanks that is specific.>
<Sign-off and name>
```

For an FYI, say so in the subject ("FYI: ...") and keep it to three lines.

## Register

- **Supervisor or senior**: respectful, direct, no hedging stacks; show you did the work before asking; offer options with your recommendation; propose a time rather than "whenever suits".
- **Colleague or team**: plain, short, first names; the ask in the first line.
- **Open-source maintainer**: lead with the issue or PR link, what you tried, what you observed, what you are asking; respect their time; no pressure.
- **Support or vendor**: account id, exact error, steps to reproduce, what you need; one issue per ticket.
- **Recruiter or external**: formal, complete sentences, one clear next step.
- **Difficult messages** (declining, disagreeing, chasing, correcting): state the position in the first line without apology or preamble, give the reason in one or two sentences, offer the alternative, keep the door open. Never argue the other person's motives.
- **Chasing**: reply in the same thread, restate the ask and the date, offer a smaller ask if the original was large.

## Rules

- One ask per message; a second ask becomes a second message or an optional line at the end.
- Dates as dates ("by Thursday 25 September"), not "soon" or "ASAP".
- No "I hope this email finds you well", no "just checking in", no "as per my last email".
- Match the length to the relationship; a supervisor reads five lines, not fifty.
- Attachments and links named in the text ("the form (attached)"), and actually attached before sending.
- Never send. Return the draft; the user sends.
- Run `humanize`.

## Output

The subject line and the body, then one line on why it is structured this way (so the user can adjust), and a note on anything that should be attached or checked before sending.
