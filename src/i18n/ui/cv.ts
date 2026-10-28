/** The CV page. The CV's own wording lives in src/data/cv.ts. */
export const cvPage = {
  label: { en: 'Curriculum vitae', bg: 'Автобиография' },
  title: { en: 'CV, written in your browser', bg: 'CV, създадено в браузъра ви' },
  lede: {
    en: 'The same facts as the rest of this site, set for print on A4. Choose a language and generate the PDF: your browser writes it on your device, with no account, no outside service and nothing to pay.',
    bg: 'Същите факти като в останалата част от сайта, подредени за печат на A4. Изберете език и създайте PDF файла: браузърът ви го създава директно на устройството ви, без акаунт, без външна услуга и без заплащане.',
  },
  contains: {
    title: { en: 'What it contains', bg: 'Какво съдържа' },
    items: [
      {
        en: 'Experience at DXC Technology, as an independent engineer and at Genpact, with dates.',
        bg: 'Опит в DXC Technology, като инженер на свободна практика и в Genpact, с дати.',
      },
      {
        en: 'Five selected projects with their real status, my part in them and the stack.',
        bg: 'Пет избрани проекта с реалния им статус, моята роля и технологиите.',
      },
      {
        en: 'Skills by area, languages, certificates and education.',
        bg: 'Умения по области, езици, сертификати и образование.',
      },
      {
        en: 'Email, website, GitHub and LinkedIn as working links. No phone number or address.',
        bg: 'Имейл, сайт, GitHub и LinkedIn като активни връзки. Без телефон и адрес.',
      },
    ],
  },
  language: { en: 'CV language', bg: 'Език на CV-то' },
  version: {
    legend: { en: 'Version', bg: 'Вариант' },
    portfolio: { en: 'Portfolio', bg: 'Портфолио' },
    portfolioNote: { en: 'With photo, for people', bg: 'Със снимка, за хора' },
    ats: { en: 'Job applications', bg: 'За кандидатстване' },
    atsNote: {
      en: 'One column, no photo, for applicant tracking systems',
      bg: 'Една колона, без снимка, за системи за подбор (ATS)',
    },
  },
  target: { en: 'Target role', bg: 'Целева позиция' },
  tailor: {
    title: { en: 'Tailor CV to a job', bg: 'Насочете CV-то към обява' },
    intro: {
      en: 'Paste a job description to see which requirements my work shows, and to order the CV around them. The text is analysed in your browser and is not sent anywhere. Nothing unproven is added to the CV.',
      bg: 'Поставете текст на обява, за да видите кои изисквания покрива работата ми и да подредите CV-то според тях. Текстът се анализира в браузъра ви и не се изпраща никъде. В CV-то не се добавя нищо недоказано.',
    },
    field: { en: 'Job description', bg: 'Текст на обявата' },
    analyse: { en: 'Analyse', bg: 'Анализирайте' },
    clear: { en: 'Clear', bg: 'Изчистете' },
    empty: {
      en: 'No technologies or practices from my skills list were found in this text.',
      bg: 'В този текст не открих технологии или практики от списъка с уменията ми.',
    },
    suggest: { en: 'This reads as a {role} role.', bg: 'Обявата прилича на позиция „{role}“.' },
    use: { en: 'Aim the CV at it', bg: 'Насочете CV-то към тази позиция' },
    applied: {
      en: 'The CV below is ordered for this job: matching skills and projects first.',
      bg: 'CV-то по-долу е подредено за тази обява: съвпадащите умения и проекти са първи.',
    },
    quote: { en: 'In the ad: “{quote}”', bg: 'В обявата: „{quote}“' },
    noScore: {
      en: 'There is no score: employers’ screening systems are their own, and a number here would only be a guess.',
      bg: 'Няма оценка в проценти: системите за подбор на работодателите са техни, а число тук би било само предположение.',
    },
    groups: {
      verified: { en: 'Shown in my work', bg: 'Показано в работата ми' },
      related: { en: 'Related experience', bg: 'Сходен опит' },
      learning: { en: 'Learning', bg: 'В процес на усвояване' },
      missing: { en: 'Not demonstrated', bg: 'Не е демонстрирано' },
    },
  },
  updating: { en: 'Updating the preview…', bg: 'Прегледът се обновява…' },
  generate: { en: 'Generate CV', bg: 'Създайте CV' },
  busy: { en: 'Writing the PDF…', bg: 'PDF файлът се създава…' },
  done: { en: 'Done: {file} is in your downloads.', bg: 'Готово: {file} е в изтеглените файлове.' },
  failed: {
    en: 'This browser could not write the PDF. The ready-made copy has the same content:',
    bg: 'Този браузър не успя да създаде PDF файла. Готовото копие има същото съдържание:',
  },
  ready: { en: 'Ready-made PDF', bg: 'Готов PDF' },
  /** {pages}: "1 page" / "2 pages", already in this locale. */
  meta: {
    en: 'A4 · {pages} · PDF with selectable text',
    bg: 'A4 · {pages} · PDF с текст, който може да се маркира',
  },
  pages: {
    en: { one: '{n} page', other: '{n} pages' },
    bg: { one: '{n} страница', other: '{n} страници' },
  },
  preview: { en: 'Preview of the {lang} CV', bg: 'Преглед на CV-то на {lang}' },
  /** {lang} in the preview label, in this page's language. */
  langName: {
    en: { en: 'English', bg: 'Bulgarian' },
    bg: { en: 'английски', bg: 'български' },
  },
  page: { en: 'Page {n} of {total}', bg: 'Страница {n} от {total}' },
  how: {
    title: { en: 'How it is made', bg: 'Как е направено' },
    body: {
      en: 'The text comes from the same data as the site, and the layout is computed once, so this preview and the PDF match line for line. pdf-lib, an open source library, embeds the fonts and the photo and writes the file in your browser. The ready-made copies are written by the same code when the site is built. The job-application version leaves out the photo and the sidebar, so a parser reads one column in order.',
      bg: 'Текстът идва от същите данни като сайта, а оформлението се изчислява веднъж, затова прегледът и PDF файлът съвпадат ред по ред. pdf-lib, библиотека с отворен код, вгражда шрифтовете и снимката и записва файла в браузъра ви. Готовите копия се записват от същия код при изграждането на сайта. Вариантът за кандидатстване е без снимка и странична колона, за да може системата за подбор да прочете една колона по ред.',
    },
  },
} as const;
