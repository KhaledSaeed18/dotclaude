---
name: standup-summary
description: Generate a standup or weekly-review update from actual work evidence - commits, branches, PRs, and issues across one or more repositories - grouped into done / in progress / blocked / next, written in plain human sentences rather than commit-message-speak. Use when preparing a daily standup, a weekly review, a sprint update, or answering "what did I work on this week".
---

Reconstruct the update from evidence, not memory. Git and the issue tracker already know what happened; the job is to translate that record into the three or four sentences a teammate actually wants to hear, at the altitude of outcomes ("shipped the retry logic for webhooks") rather than mechanics ("bumped a dependency, fixed a typo, refactored a helper").

## Step 1: Establish scope

- **Time window:** since the last workday for a standup, the last 5-7 days for a weekly. Confirm if unstated and ambiguous.
- **Identity:** the git author to filter by - `git config user.name` / `user.email` in the current repo, unless told otherwise.
- **Repositories:** default to the current one; ask whether other repos should be included when the user's request implies more ("what did I do this week" often spans several).

## Step 2: Collect the evidence

Per repository:

```bash
# Commits by the author in the window, all branches
git log --all --author="<email-or-name>" --since="<window>" \
  --pretty="%h %ad %s" --date=short

# Branches touched recently
git for-each-ref --sort=-committerdate refs/heads/ \
  --format="%(committerdate:short) %(refname:short)" | head -10
```

When `gh` is available and the repo has a GitHub remote, add the PR and review picture:

```bash
gh pr list --author "@me" --state all --limit 15 \
  --json number,title,state,updatedAt,isDraft
gh search prs --reviewed-by "@me" --updated ">$(date -v-7d +%Y-%m-%d)" --limit 10 2>/dev/null
gh issue list --assignee "@me" --state all --limit 15 --json number,title,state,updatedAt
```

Uncommitted work counts too: `git status --short` plus the current branch name usually reveals what is in progress right now.

## Step 3: Synthesize at outcome altitude

Group raw items into narrative units - a feature, a fix, a review effort - not one bullet per commit. Fifteen commits on one branch are one line. Then sort into:

- **Done:** merged, shipped, closed. Lead with the user-visible or team-visible effect.
- **In progress:** open PRs (note if awaiting review - that is a nudge, not filler), the active branch, drafts.
- **Blocked / waiting:** PRs awaiting someone else, issues waiting on answers, anything the log shows stalled for days. Only include real blockers; do not invent one for symmetry.
- **Next:** only what the evidence supports (assigned issues, an obvious follow-up) or what the user tells you. Never fabricate plans.

Translate mechanics to outcomes: "fix flaky auth test, bump vitest, retry CI" becomes "stabilized the auth test suite; CI is green again". Keep PR/issue numbers as parenthetical references.

## Step 4: Deliver in the requested shape

Default format, ready to paste into chat:

```
**Yesterday / this week**
- Shipped X (#123): <one-clause effect>
- Reviewed Y's Z PR (#125)

**Today / next**
- Finish A (PR #124, awaiting review)

**Blocked**
- B: waiting on <who/what> since <when>
```

Match the team's medium when told (Slack markdown, plain text, bullet-less prose). Keep the whole update under ten lines unless asked for the long form; the detail lives in the links. If some evidence source was unavailable (no `gh`, a repo you could not read), say so in one trailing line rather than silently narrowing the window.
