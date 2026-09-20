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

`cc-index` follows a kubectl-style command structure: running it bare prints help, and every action is an explicit subcommand.

```bash
cc-index pick
```

Arrow keys (or fuzzy-type) to filter, `enter` to resume, `esc` to cancel. Sessions are sorted by the time of their last real message (not just file activity), most recent first.

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

Tab-completion for the `pick`/`list`/`wide`/`completion`/`help` commands (and `pick`'s `--wide` flag) is available for both bash and zsh. This is generated on demand rather than shipped as files you need to keep in sync — new commands automatically show up in completion.

```bash
# bash - add to ~/.bashrc
eval "$(cc-index completion bash)"

# zsh - add to ~/.zshrc
eval "$(cc-index completion zsh)"
```

Reload your shell (or `source ~/.bashrc` / `source ~/.zshrc`) after adding the line.

## Configuration

By default, `cc-index` looks for sessions under `~/.claude`. If your Claude Code data lives elsewhere, point it at that directory instead:

```bash
CLAUDE_HOME=/path/to/custom/claude/home cc-index pick
```

## License

MIT
