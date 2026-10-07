import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { humanAge, truncate, formatDate, formatLine } from "../lib/format.js";
import { BASH_COMPLETION, ZSH_COMPLETION, SUBCOMMANDS } from "../lib/completion.js";

const BIN = fileURLToPath(new URL("../bin/cc-index.js", import.meta.url));

function runCli(args, options = {}) {
  try {
    const stdout = execFileSync("node", [BIN, ...args], { encoding: "utf8", ...options });
    return { stdout, status: 0 };
  } catch (err) {
    return { stdout: err.stdout ?? "", stderr: err.stderr ?? "", status: err.status };
  }
}

test("humanAge formats boundaries", () => {
  const now = Date.now();
  assert.equal(humanAge(now), "just now");
  assert.equal(humanAge(now - 5 * 60_000), "5m ago");
  assert.equal(humanAge(now - 3 * 3600_000), "3h ago");
  assert.equal(humanAge(now - 2 * 86400_000), "2d ago");
});

test("truncate leaves short strings alone and collapses whitespace", () => {
  assert.equal(truncate("hello   world", 50), "hello world");
  assert.equal(truncate("short", 50), "short");
});

test("truncate clips long strings with an ellipsis", () => {
  const long = "a".repeat(100);
  const result = truncate(long, 10);
  assert.equal(result.length, 10);
  assert.ok(result.endsWith("…"));
});

test("formatDate renders YYYY-MM-DD", () => {
  assert.equal(formatDate(Date.UTC(2026, 0, 5)), "2026-01-05");
});

test("formatLine narrow omits extra columns that wide includes", () => {
  const session = {
    id: "abcdef12-3456",
    name: "some session",
    cwd: "/Users/zaid/project",
    entrypoint: "cli",
    lastMessageMs: Date.now(),
    birthtimeMs: Date.now(),
  };

  const narrow = formatLine(session, false);
  const wide = formatLine(session, true);

  assert.ok(narrow.includes(session.id));
  assert.ok(narrow.includes(session.name));
  assert.ok(!narrow.includes(session.cwd));

  assert.ok(wide.includes(session.id.slice(0, 8)));
  assert.ok(wide.includes(session.cwd));
  assert.ok(wide.includes(session.entrypoint));
});

test("formatLine falls back to a placeholder when cwd is missing", () => {
  const session = {
    id: "abcdef12-3456",
    name: "some session",
    cwd: null,
    entrypoint: "cli",
    lastMessageMs: Date.now(),
    birthtimeMs: Date.now(),
  };
  assert.ok(formatLine(session, true).includes("(unknown dir)"));
});

test("cc-index help prints usage and lists every subcommand", () => {
  const { stdout, status } = runCli(["help"]);
  assert.equal(status, 0);
  for (const cmd of SUBCOMMANDS) {
    assert.ok(stdout.includes(cmd), `expected help output to mention "${cmd}"`);
  }
});

test("cc-index with no command prints the same usage as help", () => {
  const bare = runCli([]);
  const help = runCli(["help"]);
  assert.equal(bare.stdout, help.stdout);
});

test("cc-index with an unknown command exits non-zero", () => {
  const { status, stderr } = runCli(["bogus"]);
  assert.notEqual(status, 0);
  assert.ok(stderr.includes("Unknown command"));
});

test("cc-index completion rejects unsupported shells", () => {
  const { status, stderr } = runCli(["completion", "fish"]);
  assert.notEqual(status, 0);
  assert.ok(stderr.includes("Unsupported shell"));
});

test("cc-index completion bash/zsh match the library output", () => {
  assert.equal(runCli(["completion", "bash"]).stdout, BASH_COMPLETION);
  assert.equal(runCli(["completion", "zsh"]).stdout, ZSH_COMPLETION);
});

test("generated bash completion is syntactically valid", () => {
  execFileSync("bash", ["-n"], { input: BASH_COMPLETION });
});

test("generated zsh completion is syntactically valid", (t) => {
  try {
    execFileSync("zsh", ["-n"], { input: ZSH_COMPLETION });
  } catch (err) {
    if (err.code === "ENOENT") {
      t.skip("zsh not available on this runner");
      return;
    }
    throw err;
  }
});
