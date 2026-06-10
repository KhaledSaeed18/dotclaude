#!/usr/bin/env node
/**
 * injection-guard: a UserPromptSubmit hook that scans incoming prompts for
 * common prompt-injection and jailbreak patterns before Claude processes them.
 *
 * This provides a deterministic, pre-Claude layer of defense. It catches
 * explicit injection attempts in user input and in data that Claude reads from
 * files or external sources (via system-prompt override attacks).
 *
 * The patterns are intentionally conservative to minimize false positives on
 * legitimate developer prompts. This is a safety net, not a firewall.
 *
 * Fails open: any error exits 0. Zero dependencies (Node standard library, node >= 18).
 */

import { stdin } from "node:process";

/**
 * Injection patterns to block. Each has a regex and a reason.
 * Patterns are matched case-insensitively against the full prompt text.
 *
 * Conservative by design: only match phrasing that is unambiguously adversarial
 * in a developer coding context. Phrases like "ignore" or "pretend" alone are not
 * enough — they must appear with the specific context that makes them injections.
 */
const INJECTION_RULES = [
  // Classic instruction override
  {
    test: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|directives?|rules?|prompts?|context)/i,
    reason: "prompt-injection pattern: instruction override ('ignore previous instructions')",
  },
  {
    test: /disregard\s+(your|all|the)?\s*(previous|prior|above|system|original)?\s*(instructions?|rules?|prompts?|guidelines?|constraints?)/i,
    reason: "prompt-injection pattern: instruction discard",
  },
  {
    test: /forget\s+(everything|all|the\s+above|your\s+instructions?|your\s+previous)/i,
    reason: "prompt-injection pattern: instruction reset ('forget everything above')",
  },
  // System prompt extraction
  {
    test: /(print|output|reveal|show|display|repeat|tell\s+me|what\s+(is|are))\s+(your\s+)?(full\s+)?(system\s+prompt|system\s+instructions?|initial\s+instructions?|original\s+prompt)/i,
    reason: "system-prompt extraction attempt",
  },
  {
    test: /what\s+(were\s+you|are\s+your)\s+(told|instructed|programmed|trained|configured|given)/i,
    reason: "system-prompt extraction attempt",
  },
  // Hard role overrides — must be explicit enough to not false-positive on legitimate prompts
  {
    test: /you\s+are\s+now\s+(a\s+|an\s+)?(new|different|unrestricted|jailbroken|unfiltered|evil|DAN|developer\s+mode)/i,
    reason: "role-override injection: attempting to reassign Claude's identity",
  },
  {
    test: /\bDAN\s+(mode|prompt|jailbreak)\b/i,
    reason: "known jailbreak pattern: DAN (Do Anything Now)",
  },
  {
    test: /\bdeveloper\s+mode\s+(enabled|on|activated|unlocked)\b/i,
    reason: "known jailbreak pattern: developer mode activation",
  },
  // Explicit "new instructions" injection (in data being processed)
  {
    test: /\[?(system|assistant|user)\]?\s*:\s*(ignore|forget|override|disregard|new\s+instructions)/i,
    reason: "prompt-injection pattern: role-tag injection attempting to override context",
  },
  {
    test: /<<\s*(sys|system|SYS|SYSTEM)\s*>>/,
    reason: "prompt-injection pattern: raw system-tag injection",
  },
];

async function readStdin() {
  let raw = "";
  for await (const chunk of stdin) raw += chunk;
  return raw;
}

function extractPrompt(event) {
  // The field name varies across Claude Code versions; try the common ones.
  if (typeof event?.prompt === "string") return event.prompt;
  if (typeof event?.message === "string") return event.message;
  if (typeof event?.user_message === "string") return event.user_message;
  // Some versions nest it
  if (typeof event?.input?.prompt === "string") return event.input.prompt;
  return null;
}

function block(reason, snippet) {
  const preview = snippet.length > 120 ? `${snippet.slice(0, 120)}...` : snippet;
  process.stderr.write(
    `Blocked by injection-guard: ${reason}.\nPrompt snippet: ${preview}\n`,
  );
  process.exit(2);
}

async function main() {
  const raw = await readStdin();
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  if (event?.hook_event_name !== "UserPromptSubmit") process.exit(0);

  const prompt = extractPrompt(event);
  if (!prompt) process.exit(0);

  for (const rule of INJECTION_RULES) {
    if (rule.test.test(prompt)) {
      block(rule.reason, prompt);
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
