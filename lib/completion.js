export const SUBCOMMANDS = ["pick", "list", "wide", "completion", "help"];

export const BASH_COMPLETION = `_cc_index_completion() {
  local cur=\${COMP_WORDS[COMP_CWORD]}

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=($(compgen -W "${SUBCOMMANDS.join(" ")}" -- "$cur"))
    return
  fi

  case "\${COMP_WORDS[1]}" in
    pick)
      COMPREPLY=($(compgen -W "--wide" -- "$cur"))
      ;;
    completion)
      COMPREPLY=($(compgen -W "bash zsh" -- "$cur"))
      ;;
  esac
}
complete -F _cc_index_completion cc-index
`;

export const ZSH_COMPLETION = `#compdef cc-index

_cc_index() {
  local -a subcommands
  subcommands=(
    'pick:launch the interactive picker (default)'
    'list:print recent sessions and exit, no fzf'
    'wide:print recent sessions with extra columns, no fzf'
    'completion:print a shell completion script'
    'help:show usage'
  )

  _arguments -C \\
    '1: :->command' \\
    '*::options:->args'

  case $state in
    command)
      _describe 'command' subcommands
      ;;
    args)
      case $words[1] in
        pick)
          _arguments '--wide[show extra columns: age, created date, id, entrypoint, cwd]'
          ;;
        completion)
          _values 'shell' bash zsh
          ;;
      esac
      ;;
  esac
}

compdef _cc_index cc-index
`;

export function printCompletion(shell) {
  if (shell === "bash") {
    process.stdout.write(BASH_COMPLETION);
  } else if (shell === "zsh") {
    process.stdout.write(ZSH_COMPLETION);
  } else {
    console.error(`Unsupported shell: ${shell}. Use "bash" or "zsh".`);
    process.exit(1);
  }
}
