# Ръководство за настройка

[English](SETUP.md)

Тук е описано как да използвате инженерните правила (`CLAUDE.md`) с Claude
Code: в нов проект, в хранилище, което вече има инструкции, или като лични
настройки за всичките си проекти.

## Какво получавате

`CLAUDE.md` е обикновен Markdown файл с правила за работа на AI агент за
програмиране: инженерни принципи, йерархия на доказателствата, работен процес
според риска, правила за Git, тестване, сигурност и документация. Claude Code
го прочита в началото на всяка сесия като контекст. Това са насоки, а не
задължителна конфигурация: файлът не инсталира нищо, не дава достъп до модели,
не променя права и не настройва други инструменти.

## За кого е

За разработчици, които вече работят с Claude Code или с подобен агент, който
чете инструкции в Markdown, и искат изпитана отправна точка вместо празен
файл. Подходящ е за всеки език и стек; частите, които зависят от стека, са
полета за попълване.

## Какво ви трябва

- **Claude Code**, инсталиран и с вход в акаунт. Нужен е акаунт Pro, Max,
  Team, Enterprise или Console (или поддържан облачен доставчик);
  безплатният план на claude.ai не включва Claude Code. Инсталирайте го с
  официалната команда за вашата система и проверете версията:

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

  Другите начини (Homebrew, WinGet, apt/dnf/apk, npm) са в
  [официалното ръководство](https://code.claude.com/docs/en/setup).

- **Git**, ако искате да клонирате хранилището или да поддържате копието си
  актуално. Под Windows [Git for Windows](https://git-scm.com/downloads/win)
  дава на Claude Code и инструмента Bash; без него Claude Code използва
  PowerShell.

## Къде Claude Code търси инструкции

| Обхват                   | Файл                                             | Кой го вижда          | За какво                       |
| ------------------------ | ------------------------------------------------ | --------------------- | ------------------------------ |
| Проект                   | `./CLAUDE.md` или `./.claude/CLAUDE.md`          | Целият екип, през Git | Правила за това хранилище      |
| Лични, за един проект    | `./CLAUDE.local.md` (добавете го в `.gitignore`) | Само вие              | Ваши бележки за това хранилище |
| Лични, за всички проекти | `~/.claude/CLAUDE.md`                            | Само вие              | Вашите настройки навсякъде     |

Файловете се събират, а не се заменят един друг: Claude Code зарежда
`CLAUDE.md` от папката, в която го стартирате, и от всяка папка над нея, плюс
личния ви файл. Инструкциите, които са по-близо до проекта, се прочитат
последни. Един `CLAUDE.md` може да включи друг файл с ред `@path`; пътят е
относителен спрямо файла, който съдържа реда.

Източник: [How Claude remembers your project](https://code.claude.com/docs/en/memory).

## 1. Вземете файла

**Клонирайте хранилището** (така най-лесно ще го обновявате):

```bash
git clone https://github.com/macmma322/engineering-blueprint.git
```

**Или изтеглете само `CLAUDE.md`:**

```bash
# macOS, Linux, WSL
curl -fsSL https://raw.githubusercontent.com/macmma322/engineering-blueprint/main/CLAUDE.md -o engineering-blueprint.md
```

```powershell
# Windows PowerShell
Invoke-WebRequest https://raw.githubusercontent.com/macmma322/engineering-blueprint/main/CLAUDE.md -OutFile engineering-blueprint.md
```

Можете да използвате и бутона **Изтегли CLAUDE.md** на
<https://nikolay-georgiev.dev/bg/open-source>.

## 2. Използвайте го в нов проект

Изпълнете командите от корена на проекта. Те никога не презаписват
съществуващ файл.

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

След това отворете `CLAUDE.md` и попълнете **раздел 0**: заменете всяко
`<PLACEHOLDER>` с името на проекта, стека, основния клон за интеграция и
точните команди за стартиране, тестване и компилиране. Изтрийте разделите,
които не ви трябват. Добавете файла в Git, за да работи целият екип по едни и
същи правила.

## 3. Добавете го към хранилище, което вече има инструкции

Запазете своя `CLAUDE.md` и включете правилата до него. Така правилата на
проекта остават ваши, а общите правила лесно се обновяват.

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

Добавете един ред в съществуващия си `CLAUDE.md`, извън блок с код:

```text
@.claude/engineering-blueprint.md
```

След това:

1. Изтрийте **раздел 0** от `.claude/engineering-blueprint.md`; вашият
   `CLAUDE.md` вече описва проекта.
2. Прочетете двата файла за противоречия. Ако две правила си противоречат,
   Claude може да следва което и да е от тях, затова оставете това, което
   имате предвид, и изтрийте другото.
3. Правилата във вашия `CLAUDE.md` трябва изрично да казват, когато
   отменят общите, например „Използвай Yarn, не npm, въпреки общите правила.“

Пример за кратък файл на проект, който включва правилата, има в
[`examples/CLAUDE.project-example.md`](examples/CLAUDE.project-example.md).

## 4. Направете го личната си настройка

Така правилата важат за всеки проект на машината ви. Личният файл се зарежда
заедно със собствения `CLAUDE.md` на всеки проект.

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

В личния файл оставете раздел 0 за общи предпочитания или го изтрийте;
подробностите за конкретен проект са място в неговия собствен `CLAUDE.md`.

## 5. Проверете дали е зареден

Стартирайте Claude Code в проекта и изпълнете `/context`. Файлът с правилата
(или вашият `CLAUDE.md`, който го включва) се вижда под **Memory files**.
Първия път, когато проект включва файл извън своята папка, Claude Code ще ви
попита дали да го позволи.

## Как да го пригодите

- **Пазете го кратък.** Всеки ред се чете във всяка сесия. Целете се под около
  200 реда на файл и изтрийте това, което екипът ви не използва.
- **Бъдете конкретни.** „Пусни `npm test -- --run` преди commit“ се спазва
  по-надеждно от „тествай кода“.
- **Разделяйте по области**, когато проектът порасне: правилата за една част
  от кода сложете във файлове `.claude/rules/*.md`.
- **Лични бележки** за едно хранилище сложете в `CLAUDE.local.md` и го
  добавете в `.gitignore`.
- Когато правило се окаже грешно, променете файла, а не промпта си.

## Как да го обновявате

- **Клонирано хранилище:** `git -C engineering-blueprint pull`, после сравнете
  новия `CLAUDE.md` с вашето копие (`git diff --no-index`) и вземете
  промените, които искате.
- **Включено копие:** изтеглете го отново върху
  `.claude/engineering-blueprint.md` само ако не сте го редактирали; иначе
  първо сравнете. Затова при включването собствените ви правила стоят в
  отделен файл.
- В [историята на промените](https://github.com/macmma322/engineering-blueprint/commits/main)
  се вижда какво и защо е променено.

## Отстраняване на проблеми

| Проблем                                 | Какво да проверите                                                                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude не спазва правилата              | Изпълнете `/context`. Ако файлът липсва, проверете името (`CLAUDE.md`; под Linux и macOS главните букви имат значение) и че сте стартирали Claude Code в папката на проекта или под нея.          |
| Включването не работи                   | Редът `@path` не бива да е в обратни кавички или в блок с код, а пътят е относителен спрямо файла, в който е. Разрешете външните включвания, когато бъдете попитани.                              |
| Две правила си противоречат             | Изтрийте едното. Когато инструкциите не са съгласувани, Claude може да следва което и да е.                                                                                                       |
| `claude` не се разпознава               | Отворете нов терминал след инсталацията. После вижте [Troubleshoot installation](https://code.claude.com/docs/en/troubleshoot-install). `claude doctor` показва диагностика, без да променя нищо. |
| PowerShell не разпознава `irm` или `&&` | Намирате се в CMD, а не в PowerShell, или обратното. Използвайте командата за вашата обвивка.                                                                                                     |
| Изтеглянето не става                    | Проверете дали `raw.githubusercontent.com` е достъпен или използвайте бутона за изтегляне на сайта.                                                                                               |

## Как да допринесете

Issues и pull requests са добре дошли в
<https://github.com/macmma322/engineering-blueprint>. Най-лесно се приемат
малки, конкретни промени с обяснение; преди голяма преработка отворете issue.
Във файла не бива да има лични данни, лични пътища или правила, специфични за
конкретен проект.

## Лиценз

Правилата са публикувани под [лиценз MIT](LICENSE). Можете да ги използвате,
копирате, променяте, обединявате, публикувате, разпространявате,
сублицензирате и продавате, в лична или търговска работа, стига бележката за
авторското право и текстът на лиценза да останат със съществените части, които
използвате. Предоставят се без никаква гаранция.
