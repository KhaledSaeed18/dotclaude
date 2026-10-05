---
name: citation-guard
description: "A PostToolUse hook that checks every cite key in a .tex or .md file Claude just edited against the project's .bib and reports the ones that do not exist, and after a .bib edit reports duplicate keys and entries with no DOI, arXiv id, or URL. Catches an invented citation in the same step it was written. Use when drafting a thesis, paper, or proposal with AI assistance, where a fabricated reference is the one unrecoverable error."
---

# citation-guard

A Claude Code hook that makes the first level of `citation-verifier` continuous. Every time a chapter file is edited, the cite keys in it are checked against the bibliography; a key with no entry is reported immediately as context, with the instruction to add it from a real identifier via `bibtex-manager` rather than to invent one.

- **Recognises** LaTeX (`\cite`, `\citep`, `\citet`, `\parencite`, `\textcite`, `\autocite`, `\footcite`, `\citeauthor`, `\citeyear`, with optional arguments and stars) and Pandoc Markdown (`[@key]`, `[@a; @b, p. 3]`, in-text `@key`). Code blocks and emails are ignored.
- **Finds the .bib** from `citationGuard.bibFile` in config, else the nearest `.bib` walking up from the edited file, else any `.bib` in the project (four levels deep). No `.bib` means silence.
- **On a .bib edit**, reports duplicate keys and entries with no `doi`, `eprint`, `url`, or `howpublished`, which `citation-verifier` will not be able to check.
- **Context, not a block.** The edit already happened; Claude sees the problem and fixes it next.
- **Fails open**, zero dependencies (`node >= 18`).

## Files

| File | Purpose |
| --- | --- |
| `citation-guard.mjs` | The hook script. |
| `HOOK.md` | This file. |

## Activate it (required manual step)

Add this to `.claude/settings.json` (project) or `~/.claude/settings.json` (global):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/citation-guard/citation-guard.mjs\""
          }
        ]
      }
    ]
  }
}
```

Installing the `thesis` plugin from the dotclaude marketplace wires this automatically.

## Verify it

```bash
printf 'See \\cite{ghost2099}.\n' > chapters/test.tex
echo '{"tool_name":"Edit","tool_input":{"file_path":"'$PWD'/chapters/test.tex"},"cwd":"'$PWD'"}' \
  | node .claude/hooks/citation-guard/citation-guard.mjs
```

You should see a JSON object whose `additionalContext` names `ghost2099` as undefined.

## Tune it

```json
{
  "citationGuard": {
    "enabled": true,
    "bibFile": "references.bib"
  }
}
```

Set `bibFile` when the project has several `.bib` files and only one is the thesis bibliography.

> Hooks run arbitrary commands on your machine with your credentials whenever their event fires. Read any hook script (including this one) before enabling it.
