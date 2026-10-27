# Setup guide

[Български](SETUP.bg.md)

This guide shows how to put the engineering blueprint (`CLAUDE.md`) to work
with Claude Code: in a new project, in a repository that already has
instructions, or as your personal default for every project.

## What you get

`CLAUDE.md` is a plain Markdown file of working rules for an AI coding agent:
engineering principles, an evidence hierarchy, a workflow scaled to risk, Git,
testing, security and documentation rules. Claude Code reads it at the start
of every session as context. It is guidance, not enforced configuration: it
does not install anything, grant model access, change permissions or
configure other tools.

## Who it is for

Developers who already use Claude Code, or a similar agent that reads
Markdown instructions, and want a tested starting point instead of an empty
file. It suits any language or stack; the stack-specific parts are
placeholders you fill in.

## Prerequisites

- **Claude Code**, installed and signed in. It needs a Pro, Max, Team,
  Enterprise or Console account (or a supported cloud provider); the free
  claude.ai plan does not include it. Install it with the official command
  for your system, then check it:

  ```bash
  # macOS, Linux, WSL
  curl -fsSL https://claude.ai/install.sh | bash
  claude --version
  ```

  ```powershell
  # Windows PowerShell
  irm https://claude.ai/install.ps1 | iex
  claude --version
  ```

  Other methods (Homebrew, WinGet, apt/dnf/apk, npm) are in the
  [official setup guide](https://code.claude.com/docs/en/setup).

- **Git**, if you want to clone the repository or keep your copy up to date.
  On Windows, [Git for Windows](https://git-scm.com/downloads/win) also gives
  Claude Code its Bash tool; without it, Claude Code uses PowerShell.

## Where Claude Code looks for instructions

| Scope                   | File                                         | Shared with           | Use it for                         |
| ----------------------- | -------------------------------------------- | --------------------- | ---------------------------------- |
| Project                 | `./CLAUDE.md` or `./.claude/CLAUDE.md`       | Everyone, through Git | Rules for this repository          |
| Personal, one project   | `./CLAUDE.local.md` (add it to `.gitignore`) | Only you              | Your own notes for this repository |
| Personal, every project | `~/.claude/CLAUDE.md`                        | Only you              | Your defaults everywhere           |

Files are added together, not replaced: Claude Code loads `CLAUDE.md` files
from the folder you start it in and every folder above it, plus your
personal file. Instructions closer to the project are read last. A
`CLAUDE.md` can pull in another file with an `@path` line; the path is
relative to the file that contains the import.

Source: [How Claude remembers your project](https://code.claude.com/docs/en/memory).

## 1. Get the file

**Clone the repository** (easiest to update later):

```bash
git clone https://github.com/macmma322/engineering-blueprint.git
```

**Or download only `CLAUDE.md`:**

```bash
# macOS, Linux, WSL
curl -fsSL https://raw.githubusercontent.com/macmma322/engineering-blueprint/main/CLAUDE.md -o engineering-blueprint.md
```

```powershell
# Windows PowerShell
Invoke-WebRequest https://raw.githubusercontent.com/macmma322/engineering-blueprint/main/CLAUDE.md -OutFile engineering-blueprint.md
```

You can also use the **Download CLAUDE.md** button on
<https://nikolay-georgiev.dev/open-source>.

## 2. Use it in a new project

Run these from the project root. They never overwrite an existing file.

```bash
# macOS, Linux, WSL
if [ -e CLAUDE.md ]; then
  echo "CLAUDE.md already exists: follow step 3 instead."
else
  curl -fsSL https://raw.githubusercontent.com/macmma322/engineering-blueprint/main/CLAUDE.md -o CLAUDE.md
fi
```

```powershell
# Windows PowerShell
if (Test-Path CLAUDE.md) {
  Write-Host "CLAUDE.md already exists: follow step 3 instead."
} else {
  Invoke-WebRequest https://raw.githubusercontent.com/macmma322/engineering-blueprint/main/CLAUDE.md -OutFile CLAUDE.md
}
```

Then open `CLAUDE.md` and fill in **section 0**: replace every
`<PLACEHOLDER>` with your project name, stack, integration branch and the
exact commands for running, testing and building. Delete the sections that do
not apply. Commit the file so the whole team gets the same rules.

## 3. Add it to a repository that already has instructions

Keep your existing `CLAUDE.md` and import the blueprint next to it, so your
project rules stay yours and the generic rules stay easy to update.

```bash
# macOS, Linux, WSL
mkdir -p .claude
curl -fsSL https://raw.githubusercontent.com/macmma322/engineering-blueprint/main/CLAUDE.md -o .claude/engineering-blueprint.md
```

```powershell
# Windows PowerShell
New-Item -ItemType Directory -Force .claude | Out-Null
Invoke-WebRequest https://raw.githubusercontent.com/macmma322/engineering-blueprint/main/CLAUDE.md -OutFile .claude/engineering-blueprint.md
```

Add one line to your existing `CLAUDE.md`, outside any code block:

```text
@.claude/engineering-blueprint.md
```

Then:

1. Delete **section 0** from `.claude/engineering-blueprint.md`; your own
   `CLAUDE.md` already describes the project.
2. Read both files for contradictions. If two rules disagree, Claude may
   follow either, so keep the one you mean and delete the other.
3. Rules in your own `CLAUDE.md` should say when they override the
   blueprint, for example "Use Yarn, not npm, despite the blueprint."

See [`examples/CLAUDE.project-example.md`](examples/CLAUDE.project-example.md)
for a short project file that imports the blueprint.

## 4. Make it your personal default

This applies the rules to every project on your machine. Your personal file
loads together with each project's own `CLAUDE.md`.

```bash
# macOS, Linux, WSL
mkdir -p ~/.claude
if [ -e ~/.claude/CLAUDE.md ]; then
  curl -fsSL https://raw.githubusercontent.com/macmma322/engineering-blueprint/main/CLAUDE.md -o ~/.claude/engineering-blueprint.md
  echo "Add this line to ~/.claude/CLAUDE.md: @~/.claude/engineering-blueprint.md"
else
  curl -fsSL https://raw.githubusercontent.com/macmma322/engineering-blueprint/main/CLAUDE.md -o ~/.claude/CLAUDE.md
fi
```

```powershell
# Windows PowerShell
$dir = Join-Path $env:USERPROFILE '.claude'
New-Item -ItemType Directory -Force $dir | Out-Null
$url = 'https://raw.githubusercontent.com/macmma322/engineering-blueprint/main/CLAUDE.md'
if (Test-Path (Join-Path $dir 'CLAUDE.md')) {
  Invoke-WebRequest $url -OutFile (Join-Path $dir 'engineering-blueprint.md')
  Write-Host "Add this line to $dir\CLAUDE.md: @~/.claude/engineering-blueprint.md"
} else {
  Invoke-WebRequest $url -OutFile (Join-Path $dir 'CLAUDE.md')
}
```

In a personal file, leave section 0 as general preferences or delete it;
project facts belong in each project's own `CLAUDE.md`.

## 5. Check that it loaded

Start Claude Code in the project and run `/context`. The blueprint file (or
your `CLAUDE.md` that imports it) appears under **Memory files**. The first
time a project imports a file from outside the project folder, Claude Code
asks you to approve the import.

## Customize it

- **Keep it short.** Every line is read in every session. Aim for under about
  200 lines per file and delete what your team does not need.
- **Be specific.** "Run `npm test -- --run` before committing" is followed
  more reliably than "test your code".
- **Split by area** when a project grows: put rules for one part of the code
  in `.claude/rules/*.md` files.
- **Personal notes** for one repository go in `CLAUDE.local.md`, which you add
  to `.gitignore`.
- When a rule turns out to be wrong, change the file, not your prompt.

## Update it

- **Cloned repository:** `git -C engineering-blueprint pull`, then compare the
  new `CLAUDE.md` with your copy (`git diff --no-index`) and take the changes
  you want.
- **Imported copy:** download it again over `.claude/engineering-blueprint.md`
  only if you have not edited it; otherwise compare first. This is why the
  import setup keeps your own rules in a separate file.
- Read the [commit history](https://github.com/macmma322/engineering-blueprint/commits/main)
  to see what changed and why.

## Troubleshooting

| Problem                                    | What to check                                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude ignores the rules                   | Run `/context`. If the file is missing, check its name (`CLAUDE.md`, capitals matter on Linux and macOS) and that you started Claude Code in the project folder or below it.    |
| The import does nothing                    | The `@path` line must not be inside backticks or a code block, and the path is relative to the file that contains it. Approve external imports when asked.                      |
| Two rules conflict                         | Remove one. Claude may follow either when instructions disagree.                                                                                                                |
| `claude` is not recognized                 | Open a new terminal after installing. Then see [Troubleshoot installation](https://code.claude.com/docs/en/troubleshoot-install). `claude doctor` prints a read-only diagnosis. |
| PowerShell says `irm` or `&&` is not valid | You are in CMD, not PowerShell, or the other way round. Use the command for your shell.                                                                                         |
| Download fails                             | Check that `raw.githubusercontent.com` is reachable, or use the Download button on the website.                                                                                 |

## Contribute

Issues and pull requests are welcome at
<https://github.com/macmma322/engineering-blueprint>. Small, focused changes
with a reason are the easiest to accept; open an issue before a large
rewrite. Keep the file free of personal data, private paths and
project-specific rules.

## License

The blueprint is released under the [MIT License](LICENSE). You may use, copy,
modify, merge, publish, distribute, sublicense and sell copies, in personal or
commercial work, as long as the copyright notice and the license text stay
with the substantial parts you reuse. It comes without any warranty.
