# English–Bulgarian glossary

One Bulgarian term per concept, used across the case studies (`src/content/projects/bg/`),
`src/content/lab.json`, `src/i18n/ui/` and the text in `src/data/`. Product names, identifiers,
code, commands and file names are never translated. Where the Bulgarian developer community
uses an English word as a loanword (бекенд, фронтенд, къмит, фреймуърк), the site uses that
loanword in Cyrillic; where the term is a proper name or a flag (`staging`, `headless`, `nightly`,
`seed`), it stays in Latin script.

| English                         | Bulgarian                                        | Note                                                                                          |
| ------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| open source                     | отворен код; „с отворен код“ as a modifier       | Never „open source“ in running Bulgarian text.                                                |
| source code                     | изходен код                                      | „изходни файлове“ for source files.                                                           |
| developer tools                 | инструменти за разработчици                      | „инструменти за разработка“ when it means the build/run/test tooling of one project.          |
| software architecture           | софтуерна архитектура                            | „архитектурни решения“, „архитектурен преглед“.                                               |
| artificial intelligence         | изкуствен интелект                               | Spelled out only in running prose; as a modifier keep „AI“ (AI агент, AI асистент). Not „ИИ“. |
| AI coding agent                 | AI агент за програмиране                         | Short form „AI агент“ once the context is clear.                                              |
| backend / frontend              | бекенд / фронтенд                                | Not „бек-енд“, „бакенд“. „Бекенд разработчик“ for the job title.                              |
| game engine                     | игрови енджин; „енджин“                          | The word Bulgarian game developers use. Not „двигател“ (that is a motor).                     |
| engine-free                     | независим от енджина                             | Not „без енджин“ in prose; the diagram box keeps „без енджин“ for width.                      |
| real-time / realtime            | в реално време; „слой за реално време“           | The layer name is „Реално време“.                                                             |
| embedded system / hardware      | вградена система / вграден хардуер               |                                                                                               |
| automated testing / tests       | автоматизирано тестване / автоматизирани тестове | „модулни тестове“ (unit), „интеграционни тестове“, „договорни тестове“ (contract).            |
| continuous integration          | CI                                               | „непрекъсната интеграция (CI)“ only if the reader needs the expansion.                        |
| deploy / deployment             | внедрявам / внедряване                           | „внедрено“, „невнедрено“. Not „деплой“.                                                       |
| production (environment)        | продукция; „в продукция“                         | Established Bulgarian IT usage. Status label: „В продукция“.                                  |
| staging                         | staging (среда за staging)                       | Kept in Latin script.                                                                         |
| repository                      | хранилище                                        | „частно хранилище“. Not „репо“, „репозитори“.                                                 |
| Markdown vault (J.A.R.V.I.S.)   | Markdown хранилище                               | Context separates it from a Git repository.                                                   |
| branch / release branch         | клон / клон за издание                           | „интеграционен клон“, „основен клон“.                                                         |
| commit (Git)                    | къмит                                            | „commit“ stays in Latin script when it is the database/Git operation in code terms.           |
| merge / pull request            | сливане / заявка за сливане                      | „слят в интеграционния клон“.                                                                 |
| release (verb, noun)            | издавам / издание                                | „процес по издаване на версии“.                                                               |
| contribution                    | принос                                           |                                                                                               |
| installation / setup            | инсталиране / настройка                          | „скрипт за автоматична настройка“.                                                            |
| case study                      | проект (UI), описание на проекта                 | UI labels say „Проект 03“, „Към проекта“, „Следващ проект“. Not „казус“.                      |
| deterministic                   | детерминиран                                     | Not „детерминистичен“.                                                                        |
| authoritative / source of truth | меродавен / меродавен източник                   | Not „източник на истина“.                                                                     |
| authentication / authorisation  | автентикация / оторизация                        | „услуга за автентикация“. The verb „удостоверява“ stays where it means “vouches for”.         |
| headless                        | headless                                         | „headless сървър“, „headless тестове“ (no Bulgarian term fits a label).                       |
| mesh (3D)                       | мрежа; „3D мрежа“                                | Polygon mesh. Not „меш“.                                                                      |
| worker (process)                | фонов процес                                     | Names such as „AI worker“ stay as written.                                                    |
| framework                       | фреймуърк                                        | „рамка“ only in „агентна рамка“.                                                              |
| shell (command) / shell (app)   | шел / обвивка                                    | „без шел“; „обвивка на Tauri v2“, „графични обвивки“.                                         |
| snapshot                        | моментна снимка                                  |                                                                                               |
| checksum                        | контролна сума                                   | „грешка в контролната сума“.                                                                  |
| timing (constants)              | времеви параметри / времеви константи            | Not „тайминг“.                                                                                |
| bench-tested                    | изпитан на стенд                                 |                                                                                               |
| motor (KObait)                  | мотор                                            | Not „двигател“.                                                                               |
| milestone                       | етап                                             |                                                                                               |
| prompt                          | промпт                                           |                                                                                               |
| webhook                         | уебхук                                           |                                                                                               |
| Status: Production              | В продукция                                      | Labels live in `src/lib/status.ts`.                                                           |
| Status: Live, pre-launch        | Онлайн, преди старта                             |                                                                                               |
| Status: Active development      | Активна разработка                               |                                                                                               |
| Status: Prototype               | Прототип                                         |                                                                                               |
| Status: Research                | Проучване                                        |                                                                                               |
| Status: Experimental            | Експериментален                                  |                                                                                               |
| Status: Paused                  | На пауза                                         |                                                                                               |
| Status: Planned                 | Планиран                                         |                                                                                               |
| Status: Concept                 | Концепция                                        |                                                                                               |

## Typography

- Quotes: „…“. Dash: en dash with spaces ( – ); a non-breaking space before it where a line must not start with the dash.
- Thousands: a non-breaking space in five-digit and longer numbers (42 496); four-digit numbers stay unsplit (6293).
- Units in Cyrillic after a non-breaking space: 60 с, 20 мс, 25 Хц.
- Full article (-ът, -ят) on a masculine subject, short article (-а, -я) elsewhere; after an abbreviation with a hyphen: „BFF-ът“ / „BFF-а“.
