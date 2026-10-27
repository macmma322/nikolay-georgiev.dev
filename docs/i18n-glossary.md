# English–Bulgarian glossary

One Bulgarian term per concept, used across the case studies (`src/content/projects/bg/`),
`src/content/lab.json`, `src/i18n/ui/` and the text in `src/data/`. Product names, identifiers,
code, commands and file names are never translated. Where the Bulgarian developer community
uses an English word as a loanword (бекенд, фронтенд, къмит, фреймуърк), the site uses that
loanword in Cyrillic; where the term is a proper name, a flag or a label Bulgarian developers
write in Latin script (`staging`, `headless`, `full-stack`, `pull request`), it stays in Latin.

`npm run check:i18n` (part of `npm run build`) fails on an empty or English Bulgarian value, on
placeholders that differ between the locales and on hardcoded accessibility attributes;
`scripts/audit-dist.mjs` fails on English sentences left in a built Bulgarian page.

## Voice

- The visitor is addressed formally: „Изберете“, „Свържете се“, „Копирайте“, „Изтеглете“. Buttons
  and links use the same plural imperative (not „Копирай“, „Изтегли“).
- The owner speaks in the first person singular, as in English.
- Short engineering maxims in the decision cards keep the generic second person singular
  („Измери…, преди да…“): they are lessons, not instructions to the reader.
- No marketing tone: no „иновативен“, „мощен“, „решения“ for products, no exclamation marks.

## Terms

| English                              | Bulgarian                                                 | Note                                                                                                            |
| ------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| open source                          | отворен код; „с отворен код“ as a modifier                | Never „open source“ in running Bulgarian text. „не е с отворен код“ after a licence name.                       |
| source code                          | изходен код                                               | „изходни файлове“ for source files.                                                                             |
| repository                           | хранилище                                                 | „частно хранилище“. Not „репо“, „репозитори“.                                                                   |
| contributors (of a project)          | сътрудници; „сътрудниците на Caddy“                       | „Matthew Holt и сътрудници“.                                                                                    |
| developer / engineering blueprint    | „Правила за разработка“ (the published CLAUDE.md)         | A name, so in quotes in running text. Not „шаблон“, „чертеж“. The document itself stays in English.             |
| developer tools                      | инструменти за разработчици                               | „инструменти за разработка“ when it means the build/run/test tooling of one project.                            |
| development environment              | среда за разработка                                       | Both the deployed environment and the local toolchain.                                                          |
| production (environment)             | продукционна среда                                        | „внедряване в продукционната среда“. Not „в продукция“ in prose: it reads as a calque.                          |
| production (a live system for users) | работещ, в реална употреба                                | „работещи уеб платформи“, „USS X Academy е в реална употреба“.                                                  |
| deploy / deployment                  | внедрявам / внедряване                                    | „внедрено“, „невнедрено“. Not „деплой“.                                                                         |
| staging                              | staging (среда за staging)                                | Kept in Latin script.                                                                                           |
| software architecture                | софтуерна архитектура                                     | „архитектурни решения“, „архитектурен преглед“.                                                                 |
| artificial intelligence              | изкуствен интелект                                        | Spelled out only in running prose; as a modifier keep „AI“ (AI агент, AI асистент). Not „ИИ“.                   |
| AI coding agent                      | AI агент за програмиране                                  | Short form „AI агент“ once the context is clear.                                                                |
| local model inference                | изпълнение на локален модел; „локалният модел работи на…“ | Not „инференция“ in prose.                                                                                      |
| model host                           | сървър за модели                                          | Not „хост на модели“.                                                                                           |
| backend / frontend                   | бекенд / фронтенд                                         | Not „бек-енд“, „бакенд“. „Бекенд разработчик“ for the job title.                                                |
| full-stack                           | full-stack                                                | „Full-stack платформи“. Not „пълностеков“.                                                                      |
| game engine                          | игрови енджин; „енджин“                                   | The word Bulgarian game developers use. Not „двигател“ (that is a motor).                                       |
| engine-free                          | независим от енджина                                      | Not „без енджин“ in prose; the diagram box keeps „без енджин“ for width.                                        |
| real-time / realtime                 | в реално време; „слой за реално време“                    | The layer name is „Реално време“.                                                                               |
| embedded systems (field)             | вградени системи; „електроника и вградени системи“        | The hero and SEO lines use the pair; „вградена електроника“ where „системи“ would repeat.                       |
| embedded hardware (a board)          | вграден хардуер                                           | Only for the physical boards themselves.                                                                        |
| low-level software / system software | софтуер на ниско ниво / системен софтуер                  | „системен софтуер“ is the layer name (boot, kernel).                                                            |
| bootloader                           | зареждащ модул                                            | Used throughout Malrynth. See the audit report: „програма за начално зареждане“ is the more formal alternative. |
| wireless communication               | безжична връзка                                           | KObait: area only, never the radio, protocol or timing.                                                         |
| hardware components                  | хардуерни компоненти; „части“ in the /setup explorer      |                                                                                                                 |
| graphics card                        | видеокарта                                                | „видеопамет“ for VRAM.                                                                                          |
| motherboard                          | дънна платка                                              |                                                                                                                 |
| memory / storage                     | памет (RAM) / дискове, място за съхранение                | „системен диск“, „дискове за архив“ (bulk storage).                                                             |
| upgrade (hardware)                   | надграждане                                               | Not „ъпгрейд“.                                                                                                  |
| switches (keyboard)                  | превключватели                                            | Not „бутони“.                                                                                                   |
| automated testing / tests            | автоматизирано тестване / автоматизирани тестове          | „модулни тестове“ (unit), „интеграционни тестове“, „договорни тестове“ (contract).                              |
| continuous integration               | CI                                                        | „непрекъсната интеграция (CI)“ only if the reader needs the expansion.                                          |
| CI/CD                                | CI/CD                                                     | „непрекъсната интеграция и внедряване“ only as an expansion.                                                    |
| accessibility                        | достъпност                                                | „достъпен от клавиатура“, „екранни четци“.                                                                      |
| development roadmap                  | план за развитие                                          | /setup section „План за развитие“. Not „пътна карта“.                                                           |
| Markdown vault (J.A.R.V.I.S.)        | Markdown хранилище                                        | Context separates it from a Git repository.                                                                     |
| branch / release branch              | клон / клон за издание                                    | „интеграционен клон“, „основен клон“.                                                                           |
| worktree (Git)                       | работно копие (worktree)                                  | „(worktree)“ on first use in a passage. Not „работно дърво“.                                                    |
| commit (Git)                         | къмит                                                     | „commit“ stays in Latin script when it is the database/Git operation in code terms.                             |
| merge / pull request                 | сливане / заявка за сливане                               | „слят в интеграционния клон“. GitHub's own feature and the contribution notes keep „pull request“, „issue“.     |
| release (verb, noun)                 | издавам / издание                                         | „процес по издаване на версии“.                                                                                 |
| contribution                         | принос                                                    |                                                                                                                 |
| installation / setup                 | инсталиране / настройка                                   | „скрипт за автоматична настройка“. The /setup page itself is „Техника“.                                         |
| case study                           | проект (UI), описание на проекта                          | UI labels say „Проект 03“, „Към проекта“, „Следващ проект“. Not „казус“.                                        |
| deterministic                        | детерминиран                                              | Not „детерминистичен“.                                                                                          |
| authoritative / source of truth      | меродавен / меродавен източник                            | Not „източник на истина“.                                                                                       |
| authentication / authorisation       | автентикация / оторизация                                 | „услуга за автентикация“. The verb „удостоверява“ stays where it means “vouches for”.                           |
| headless                             | headless                                                  | „headless сървър“, „headless тестове“ (no Bulgarian term fits a label).                                         |
| mesh (3D)                            | мрежа; „3D мрежа“                                         | Polygon mesh. Not „меш“.                                                                                        |
| worker (process)                     | фонов процес                                              | Names such as „AI worker“ stay as written.                                                                      |
| framework                            | фреймуърк                                                 | „рамка“ only in „агентна рамка“.                                                                                |
| shell (command) / shell (app)        | шел / обвивка                                             | „без шел“; „обвивка на Tauri v2“, „графични обвивки“.                                                           |
| snapshot                             | моментна снимка                                           |                                                                                                                 |
| checksum                             | контролна сума                                            | „грешка в контролната сума“.                                                                                    |
| timing (constants)                   | времеви параметри / времеви константи                     | Not „тайминг“.                                                                                                  |
| bench-tested                         | изпитан на стенд                                          |                                                                                                                 |
| motor (KObait)                       | мотор                                                     | Not „двигател“.                                                                                                 |
| milestone                            | етап                                                      |                                                                                                                 |
| prompt                               | промпт                                                    |                                                                                                                 |
| webhook                              | уебхук                                                    |                                                                                                                 |

## Status labels

Project statuses live in `src/lib/status.ts`; the /setup labels in `src/i18n/ui/setup.ts`. Labels
stay short: they sit in pills and on the Open Graph cards.

| English (project)  | Bulgarian            | English (/setup part)  | Bulgarian                   |
| ------------------ | -------------------- | ---------------------- | --------------------------- |
| Production         | В експлоатация       | In use                 | В употреба                  |
| Live, pre-launch   | Онлайн, преди старта | Owned, not in use      | Налично, не се използва     |
| Active development | Активна разработка   | Previously used        | Използвано преди            |
| Prototype          | Прототип             | Planned purchase       | Планирана покупка           |
| Research           | Проучване            | Future ideas (roadmap) | Бъдещи идеи                 |
| Experimental       | Експериментален      | Installed, not used    | Инсталирано, не се използва |
| Paused             | На пауза             |                        |                             |
| Planned            | Планиран             |                        |                             |
| Concept            | Концепция            |                        |                             |

## Typography

- Quotes: „…“. Dash: en dash with spaces ( – ); a non-breaking space before it where a line must not start with the dash.
- Thousands: a non-breaking space in five-digit and longer numbers (42 496); four-digit numbers stay unsplit (6293).
- Units in Cyrillic after a non-breaking space: 60 с, 20 мс, 25 Хц.
- Full article (-ът, -ят) on a masculine subject, short article (-а, -я) elsewhere; after an abbreviation with a hyphen: „BFF-ът“ / „BFF-а“.
- In `.ts` sources a no-break space is written as the JavaScript escape for U+00A0; Markdown files use the character itself.
