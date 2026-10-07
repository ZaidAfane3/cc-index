# cc-index

[![CI](https://github.com/ZaidAfane3/cc-index/actions/workflows/ci.yml/badge.svg)](https://github.com/ZaidAfane3/cc-index/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Arrow-key picker for [Claude Code](https://claude.com/claude-code) sessions — resume the right session in the right directory, from anywhere.

Claude Code stores every session as a JSONL transcript under `~/.claude/projects/`, but there's no built-in way to browse and jump back into an old one from wherever you happen to be. `cc-index` scans all of them, lets you fuzzy-pick one, and resumes it from its original working directory — so you don't have to remember which folder a session belongs to.

## Features

- Fuzzy, arrow-key session picker powered by [fzf](https://github.com/junegunn/fzf)
- Resumes a session in its original working directory, not wherever you happen to be
- Sorts by the time of the last real message, ignoring file-touch noise from opening/closing a session
- kubectl-style subcommands with bash and zsh tab completion
- Supports non-default Claude Code data locations via `CLAUDE_HOME`

## Requirements

- Node.js >= 16
- [fzf](https://github.com/junegunn/fzf) — `brew install fzf`
- The `claude` CLI on your `PATH`

## Installation

```bash
npm install -g cc-index
```

## Usage

`cc-index` follows a kubectl-style command structure: running it bare prints help, and every action is an explicit subcommand.

```bash
cc-index pick
```

Arrow keys (or fuzzy-type) to filter, `enter` to resume, `esc` to cancel.

### Commands

| Command               | Description                                                            |
|------------------------|------------------------------------------------------------------------|
| `pick [--wide]`         | Launch the interactive fzf picker and resume the chosen session.       |
| `list`                  | Print the 20 most recent sessions and exit (no `fzf` required).        |
| `wide`                  | Same as `list`, with extra columns: age, created-on date, id, entrypoint, cwd. |
| `completion <shell>`    | Print a shell completion script (`bash` or `zsh`).                     |
| `help`                  | Show usage. Also shown when running `cc-index` with no command.        |

```bash
cc-index pick
cc-index pick --wide
cc-index list
cc-index wide
```

## How it works

1. Walks every `*.jsonl` file under `~/.claude/projects/`.
2. Parses each transcript for a title (custom title, agent name, or first user message), its working directory, and the timestamp of the last actual `user`/`assistant` turn — bookkeeping entries that get appended just from opening/closing a session (snapshots, reminders, etc.) don't count.
3. Sorts sessions by that last-message time, newest first.
4. Hands the list to `fzf` for picking.
5. Runs `claude --resume <sessionId>` from the session's original `cwd`.

## Shell completion

Tab-completion for the `pick`/`list`/`wide`/`completion`/`help` commands (and `pick`'s `--wide` flag) is available for both bash and zsh. It's generated on demand by `cc-index completion <shell>` rather than shipped as static files you need to keep in sync — new commands automatically show up in completion. This is the same pattern used by `kubectl`, `gh`, `docker`, etc.

### zsh

Add this line to `~/.zshrc`:

```bash
eval "$(cc-index completion zsh)"
```

### bash

Add this line to `~/.bashrc`:

```bash
eval "$(cc-index completion bash)"
```

### Apply it

Reload your shell, or source the file directly:

```bash
source ~/.zshrc   # or: source ~/.bashrc
```

Then `cc-index <TAB>` should list the available commands.

## Configuration

By default, `cc-index` looks for sessions under `~/.claude`. If your Claude Code data lives elsewhere, point it at that directory instead:

```bash
CLAUDE_HOME=/path/to/custom/claude/home cc-index pick
```

## Development

```bash
npm test
```

Runs the test suite (`node --test`), covering the pure formatting helpers and the CLI's command dispatch, including a syntax check of the generated shell completion scripts. CI runs this on every push/PR across Node 18, 20, and 22.

## Contributing

Issues and pull requests are welcome. For anything non-trivial, please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
