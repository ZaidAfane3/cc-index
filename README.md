# cc-index

Arrow-key picker for [Claude Code](https://claude.com/claude-code) sessions — resumes the right session in the right directory.

Claude Code stores every session as a JSONL transcript under `~/.claude/projects/`, but there's no built-in way to browse and jump back into an old one from wherever you happen to be. `cc-index` scans all of them, lets you fuzzy-pick one, and resumes it from its original working directory — so you don't have to remember which folder a session belongs to.

## Install

```bash
npm install -g cc-index
```

Requires [fzf](https://github.com/junegunn/fzf) for the interactive picker:

```bash
brew install fzf
```

## Usage

```bash
cc-index
```

Arrow keys (or fuzzy-type) to filter, `enter` to resume, `esc` to cancel. Sessions are sorted by the time of their last real message (not just file activity), most recent first.

### Flags

| Flag      | Description                                                          |
|-----------|-----------------------------------------------------------------------|
| `--list`  | Print the 20 most recent sessions and exit (no `fzf` required).       |
| `--wide`  | Show extra columns: age, created-on date, session id, entrypoint, cwd. |

```bash
cc-index --list
cc-index --list --wide
```

## How it works

1. Walks every `*.jsonl` file under `~/.claude/projects/`.
2. Parses each transcript for a title (custom title, agent name, or first user message), its working directory, and the timestamp of the last actual `user`/`assistant` turn — bookkeeping entries that get appended just from opening/closing a session (snapshots, reminders, etc.) don't count.
3. Sorts sessions by that last-message time, newest first.
4. Hands the list to `fzf` for picking.
5. Runs `claude --resume <sessionId>` from the session's original `cwd`.

## Configuration

By default, `cc-index` looks for sessions under `~/.claude`. If your Claude Code data lives elsewhere, point it at that directory instead:

```bash
CLAUDE_HOME=/path/to/custom/claude/home cc-index
```

## License

MIT
