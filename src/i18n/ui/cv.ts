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
      en: 'The text comes from the same data as the site, and the layout is computed once, so this preview and the PDF match line for line. pdf-lib, an open source library, embeds the fonts and the photo and writes the file in your browser. The ready-made copy is written by the same code when the site is built.',
      bg: 'Текстът идва от същите данни като сайта, а оформлението се изчислява веднъж, затова прегледът и PDF файлът съвпадат ред по ред. pdf-lib, библиотека с отворен код, вгражда шрифтовете и снимката и записва файла в браузъра ви. Готовото копие се записва от същия код при изграждането на сайта.',
    },
  },
} as const;
