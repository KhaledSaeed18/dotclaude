#!/usr/bin/env node
/**
 * sensitive-file-guard: a PreToolUse hook that blocks Read, Edit, Write, and
 * Bash tool operations that target sensitive files (.env, credentials, SSH keys,
 * certificates, secret files, AWS config, netrc, and similar).
 *
 * Motivation: command-guard blocks destructive shell commands, but a `cat .env`
 * or a `Read` tool call targeting `.env.production` is not destructive — it is
 * exfiltration. This hook closes that gap.
 *
 * Fails open: any error in the hook itself exits 0 so it can never break a
 * legitimate file operation. Zero dependencies (Node standard library, node >= 18).
 */

import { stdin } from "node:process";

/**
 * Patterns matched against file paths (for Read/Edit/Write) and against command
 * strings (for Bash). Tested against the basename and the full normalized path.
 *
 * Intentionally conservative: only files that are almost always secrets and
 * almost never needed by an agentic task. A CI pipeline reading its own .env
 * is not a case Claude Code needs to handle autonomously.
 */
const SENSITIVE_PATH_PATTERNS = [
  // .env files: .env, .env.local, .env.production, .env.test, etc.
  /(?:^|\/)\.env(\.[a-zA-Z0-9]+)?$/,
  // Generic credential files
  /(?:^|\/)credentials?(?:\.(json|ya?ml|toml|ini|txt))?$/i,
  // SSH private keys (not .pub — public keys are fine)
  /(?:^|\/)id_(rsa|dsa|ecdsa|ed25519)$/,
  // Certificate and key containers
  /\.(pem|p12|pfx|cer|crt|der)$/i,
  // Raw private key files
  /(?:^|\/).*\.(key)$/i,
  // AWS credentials
  /(?:^|\/)\.aws\/(credentials|config)$/,
  // Netrc (stores login credentials for CLI tools)
  /(?:^|\/)\.netrc$/,
  /(?:^|\/)_netrc$/,
  // macOS Keychain exports
  /\.keychain(-db)?$/i,
  // Token files
  /(?:^|\/)\.?tokens?(?:\.(json|txt|env))?$/i,
  // Secret/secrets files
  /(?:^|\/)secrets?(?:\.(json|ya?ml|toml|env|txt))?$/i,
  // API key files
  /(?:^|\/)api[_-]?keys?(?:\.(json|ya?ml|toml|txt))?$/i,
  // GPG private key exports
  /(?:^|\/).*\.gpg$/i,
  // OAuth token stores
  /(?:^|\/)\.?oauth[_-]?(token|cred)s?(?:\.(json|txt))?$/i,
  // Service account / auth files common to GCP/Firebase
  /(?:^|\/)service[_-]?account(?:s)?(?:\.(json|ya?ml))?$/i,
];

/**
 * Additionally scan Bash command strings for shell operations that read
 * sensitive files. Matches patterns like: cat .env, less .env.local, etc.
 */
const SENSITIVE_BASH_PATTERNS = [
  // Shell commands that read file contents targeting sensitive names
  /\b(cat|less|more|head|tail|bat|view|open|nano|vim?|emacs|code)\b[^|;&]*(?:\/|^)?\.env(\.[a-zA-Z0-9]+)?(\s|$|>|;)/,
  /\b(cat|less|more|head|tail|bat)\b[^|;&]*\bcredentials?\b/i,
  /\b(cat|less|more|head|tail|bat)\b[^|;&]*\bid_(rsa|dsa|ecdsa|ed25519)\b/,
  /\b(cat|less|more|head|tail|bat)\b[^|;&]*\.aws\/credentials/,
  /\b(cat|less|more|head|tail|bat)\b[^|;&]*\.netrc\b/,
  /\b(cat|less|more|head|tail|bat)\b[^|;&]*secrets?\.(?:json|ya?ml|toml|env|txt)/i,
  /\b(cat|less|more|head|tail|bat)\b[^|;&]*api[_-]?keys?\.(?:json|ya?ml|txt)/i,
  /\b(cat|less|more|head|tail|bat)\b[^|;&]*service[_-]?account\.json/i,
  // Environment variable dumps
  /\benv\b.*>\s*[^|;&]+/,
  /\bprintenv\b.*>\s*[^|;&]+/,
];

/** Tools that carry a file path in their input. */
const FILE_TOOLS = new Set(["Read", "Edit", "Write", "MultiEdit"]);

function isSensitivePath(filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  const normalized = filePath.replace(/\\/g, "/");
  return SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isSensitiveBashCommand(command) {
  if (!command || typeof command !== "string") return false;
  return SENSITIVE_BASH_PATTERNS.some((pattern) => pattern.test(command));
}

async function readStdin() {
  let raw = "";
  for await (const chunk of stdin) raw += chunk;
  return raw;
}

function block(reason, target) {
  process.stderr.write(
    `Blocked by sensitive-file-guard: ${reason}.\nTarget: ${target}\n\nIf you need to read this file, do it yourself — do not ask Claude to read it.\n`,
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

  const tool = event?.tool_name;
  const input = event?.tool_input;

  if (FILE_TOOLS.has(tool)) {
    const filePath = input?.file_path ?? input?.path ?? "";
    if (isSensitivePath(filePath)) {
      block(
        `the file "${filePath}" matches a sensitive-file pattern (credentials, keys, secrets, or .env)`,
        filePath,
      );
    }
  }

  if (tool === "Bash") {
    const command = typeof input?.command === "string" ? input.command : "";

    // Check if the bash command accesses a sensitive path
    const allPaths = [
      ...(command.match(
        /(?:^|\s)([\w./~${}][^\s;|&>]*(?:\.env\S*|credentials?\S*|id_rsa\S*|\.pem\S*|\.key\S*|\.netrc\S*|secrets?\S*|service_account\S*))/gi,
      ) ?? []),
    ].map((s) => s.trim());

    for (const p of allPaths) {
      if (isSensitivePath(p)) {
        block(`the Bash command targets "${p}" which matches a sensitive-file pattern`, command);
      }
    }

    // Check Bash-specific shell-read patterns
    if (isSensitiveBashCommand(command)) {
      block("the Bash command reads or dumps a sensitive file or environment variables", command);
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
