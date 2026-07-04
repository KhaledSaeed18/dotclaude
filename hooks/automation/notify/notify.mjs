#!/usr/bin/env node
/**
 * notify: a Notification hook that surfaces Claude Code notifications as
 * native desktop notifications, so a long-running session can be left in the
 * background and still get your attention when Claude needs input or finishes.
 *
 * Platform support:
 *   - macOS: osascript `display notification` (built in, no setup)
 *   - Linux: notify-send (libnotify), skipped silently if not installed
 *   - elsewhere: no-op
 *
 * The notification text is sanitized before being passed to the OS tool, so
 * message content can never inject into the osascript/notify-send invocation.
 *
 * Fails open: any error exits 0. Zero dependencies (Node standard library,
 * node >= 18).
 */

import { execFileSync } from "node:child_process";
import { platform } from "node:os";
import { stdin } from "node:process";

const TITLE = "Claude Code";
const MAX_LEN = 200;

/** Strip control chars and quoting that could escape the OS command's string. */
function sanitize(text) {
  const clean = String(text)
    // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control chars is the point
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/["'`\\]/g, "")
    .trim();
  return clean.length > MAX_LEN ? `${clean.slice(0, MAX_LEN)}…` : clean;
}

function notify(message) {
  if (platform() === "darwin") {
    execFileSync("osascript", ["-e", `display notification "${message}" with title "${TITLE}"`], {
      stdio: "ignore",
      timeout: 5_000,
    });
    return;
  }
  if (platform() === "linux") {
    execFileSync("notify-send", [TITLE, message], { stdio: "ignore", timeout: 5_000 });
  }
}

async function readStdin() {
  let raw = "";
  for await (const chunk of stdin) raw += chunk;
  return raw;
}

async function main() {
  const raw = await readStdin();
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return;
  }

  const message = sanitize(event?.message ?? event?.notification ?? "Claude Code needs attention");
  if (message === "") return;
  notify(message);
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
