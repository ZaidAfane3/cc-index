#!/usr/bin/env node
// cc-index - Claude Code session index
// Lists Claude Code sessions, lets you arrow-key pick one (via fzf),
// then resumes it from its original working directory.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import { spawn, spawnSync } from "node:child_process";
import { truncate, formatLine } from "../lib/format.js";
import { printCompletion } from "../lib/completion.js";

const CLAUDE_HOME = process.env.CLAUDE_HOME || path.join(os.homedir(), ".claude");
const PROJECTS_DIR = path.join(CLAUDE_HOME, "projects");
const FIELD_SEP = "\x1f";

async function extractSessionInfo(filePath) {
  let title = null;
  let cwd = null;
  let firstUserMsg = null;
  let entrypoint = null;
  let lastMessageMs = null;

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    if (obj.type === "custom-title" && obj.customTitle) {
      title = obj.customTitle;
    } else if (obj.type === "agent-name" && obj.agentName) {
      title = title ?? obj.agentName;
    } else if (obj.type === "ai-title" && obj.aiTitle) {
      title = title ?? obj.aiTitle;
    }

    if (obj.cwd) cwd = obj.cwd;
    if (obj.entrypoint) entrypoint = obj.entrypoint;

    if (!firstUserMsg && obj.type === "user" && obj.message) {
      const content = obj.message.content;
      if (typeof content === "string") {
        firstUserMsg = content;
      } else if (Array.isArray(content)) {
        const textBlock = content.find((c) => c.type === "text");
        if (textBlock) firstUserMsg = textBlock.text;
      }
    }

    // Only actual conversation turns count as "last message" - bookkeeping
    // entries (file-history-snapshot, attachments, etc.) get appended just
    // from opening/closing a session and shouldn't bump its recency.
    if ((obj.type === "user" || obj.type === "assistant") && obj.timestamp) {
      const ms = Date.parse(obj.timestamp);
      if (!Number.isNaN(ms)) lastMessageMs = ms;
    }
  }

  return { title, cwd, firstUserMsg, entrypoint, lastMessageMs };
}

async function collectSessions() {
  const sessions = [];
  if (!fs.existsSync(PROJECTS_DIR)) return sessions;

  const projectDirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });

  for (const entry of projectDirs) {
    if (!entry.isDirectory()) continue;
    const projectPath = path.join(PROJECTS_DIR, entry.name);

    let files;
    try {
      files = fs.readdirSync(projectPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const f of files) {
      if (!f.isFile() || !f.name.endsWith(".jsonl")) continue;
      const filePath = path.join(projectPath, f.name);
      const sessionId = path.basename(f.name, ".jsonl");

      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch {
        continue;
      }
      if (stat.size === 0) continue;

      const { title, cwd, firstUserMsg, entrypoint, lastMessageMs } = await extractSessionInfo(filePath);
      const displayName = title || (firstUserMsg ? truncate(firstUserMsg, 60) : "(untitled)");

      sessions.push({
        id: sessionId,
        name: displayName,
        cwd: cwd || null,
        entrypoint: entrypoint || "unknown",
        lastMessageMs: lastMessageMs ?? stat.mtimeMs,
        birthtimeMs: stat.birthtimeMs,
      });
    }
  }

  sessions.sort((a, b) => b.lastMessageMs - a.lastMessageMs);
  return sessions;
}

function pickWithFzf(sessions, wide) {
  const lines = sessions.map((s) => `${formatLine(s, wide)}${FIELD_SEP}${s.id}`);

  const result = spawnSync(
    "fzf",
    [
      "--ansi",
      "--delimiter=" + FIELD_SEP,
      "--with-nth=1",
      "--height=80%",
      "--layout=reverse",
      "--border",
      "--prompt=claude sessions> ",
      "--header=↑/↓ to move, enter to resume, esc to cancel",
    ],
    {
      input: lines.join("\n"),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "inherit"],
    }
  );

  if (result.status !== 0 || !result.stdout) return null;
  const selectedId = result.stdout.trim().split(FIELD_SEP)[1];
  return sessions.find((s) => s.id === selectedId) || null;
}

function printUsage() {
  console.log(`Usage: cc-index <command>

Commands:
  pick [--wide]      Launch the interactive fzf picker and resume the chosen session.
  list               Print the 20 most recent sessions and exit (no fzf).
  wide               Same as list, with extra columns: age, created date, id, entrypoint, cwd.
  completion <shell> Print a shell completion script (bash or zsh).
  help               Show this usage.

Running "cc-index" with no command shows this help.

Enable tab completion:
  # bash (add to ~/.bashrc)
  eval "$(cc-index completion bash)"

  # zsh (add to ~/.zshrc)
  eval "$(cc-index completion zsh)"
`);
}

async function runList(wide) {
  const sessions = await collectSessions();

  if (sessions.length === 0) {
    console.error("No Claude Code sessions found under " + PROJECTS_DIR);
    process.exit(1);
  }

  for (const s of sessions.slice(0, 20)) {
    console.log(formatLine(s, wide));
  }
}

async function runPick(wide) {
  const sessions = await collectSessions();

  if (sessions.length === 0) {
    console.error("No Claude Code sessions found under " + PROJECTS_DIR);
    process.exit(1);
  }

  const hasFzf = spawnSync("which", ["fzf"], { stdio: "ignore" }).status === 0;
  if (!hasFzf) {
    console.error("fzf is required (brew install fzf)");
    process.exit(1);
  }

  const picked = pickWithFzf(sessions, wide);
  if (!picked) {
    process.exit(0); // cancelled
  }

  if (!picked.cwd) {
    console.error(`Session ${picked.id} has no recorded working directory.`);
    process.exit(1);
  }

  if (!fs.existsSync(picked.cwd)) {
    console.error(`Working directory no longer exists: ${picked.cwd}`);
    console.error(`Session id: ${picked.id}`);
    process.exit(1);
  }

  console.log(`Resuming "${picked.name}" in ${picked.cwd}`);

  const child = spawn("claude", ["--resume", picked.id], {
    cwd: picked.cwd,
    stdio: "inherit",
  });

  child.on("exit", (code) => process.exit(code ?? 0));
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case undefined:
    case "help":
    case "--help":
    case "-h":
      printUsage();
      return;
    case "completion":
      printCompletion(process.argv[3]);
      return;
    case "list":
      await runList(process.argv.includes("--wide"));
      return;
    case "wide":
      await runList(true);
      return;
    case "pick":
      await runPick(process.argv.includes("--wide"));
      return;
    default:
      console.error(`Unknown command: ${command}\n`);
      printUsage();
      process.exit(1);
  }
}

main();
