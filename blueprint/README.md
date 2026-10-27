# Engineering blueprint: a portable CLAUDE.md

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**English** · [Български](#на-български)

The working rules I give AI coding agents (Claude Code, Codex and similar) in
every repository: engineering principles, an evidence hierarchy, a workflow
scaled to risk, agent coordination, Git, testing, security, documentation and
closeout rules. Project specifics are `<PLACEHOLDER>`s you fill in.

Shared for learning and development use by
[Nikolay Georgiev](https://nikolay-georgiev.dev/open-source). Read it online
at <https://nikolay-georgiev.dev/open-source/blueprint>.

## Quick start

```bash
# In a new project (does not overwrite an existing CLAUDE.md)
[ -e CLAUDE.md ] || curl -fsSL https://raw.githubusercontent.com/macmma322/engineering-blueprint/main/CLAUDE.md -o CLAUDE.md
```

```powershell
# Windows PowerShell
if (-not (Test-Path CLAUDE.md)) { Invoke-WebRequest https://raw.githubusercontent.com/macmma322/engineering-blueprint/main/CLAUDE.md -OutFile CLAUDE.md }
```

Then fill in section 0 and delete what does not apply. Already have a
`CLAUDE.md`? Import the blueprint next to it instead: see the setup guide.

## Documentation

|                      | English                                                                  | Български                                |
| -------------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| Setup guide          | [SETUP.md](SETUP.md)                                                     | [SETUP.bg.md](SETUP.bg.md)               |
| The rules            | [CLAUDE.md](CLAUDE.md)                                                   | English only (agents read it as written) |
| Example project file | [examples/CLAUDE.project-example.md](examples/CLAUDE.project-example.md) |                                          |

The guide covers prerequisites, new and existing projects, personal
(user-level) setup, checking that it loaded, customising, updating and
troubleshooting, on Windows, macOS and Linux.

**What it is not:** it does not install Claude Code, give access to models or
configure other tools. It is plain Markdown that Claude Code reads as context.

## Contributing

Issues and pull requests are welcome. Small, focused changes with a reason are
the easiest to accept; open an issue before a large rewrite.

## License

[MIT](LICENSE) © 2026 Nikolay Georgiev. Use, copy, modify and redistribute
it, commercially or not, as long as the copyright and license notice stay
with it.

---

## На български

Правилата, които давам на AI агентите за програмиране (Claude Code, Codex и
подобни) във всяко хранилище: инженерни принципи, йерархия на
доказателствата, работен процес според риска, координация на агентите, Git,
тестване, сигурност, документация и отчет при приключване. Подробностите за
проекта са полета `<PLACEHOLDER>`, които попълвате.

- **Настройка:** [SETUP.bg.md](SETUP.bg.md), с примери за Windows, macOS и
  Linux.
- **Самите правила:** [CLAUDE.md](CLAUDE.md), на английски, защото агентите
  ги четат такива, каквито са написани.
- **Онлайн:** <https://nikolay-georgiev.dev/bg/open-source>
- **Лиценз:** [MIT](LICENSE).
