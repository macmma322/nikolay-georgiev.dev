import type { L } from '@/i18n';

/**
 * The enquiry form on /contact: the four kinds of enquiry, their fields, the
 * consultation check and the booking step. Keys of `types`, `help`, `stage`
 * and `followUp` match the ids in mail-agent/enquiry.mjs.
 */
export const enquiry = {
  label: { en: 'Enquiry', bg: 'Запитване' },
  title: { en: 'Let’s start with what you need.', bg: 'Да започнем с това, от което имате нужда.' },
  support: {
    en: 'Whether you have a question, a project, or an opportunity to discuss, choose what best describes your enquiry.',
    bg: 'Въпрос, проект или възможност за разговор: изберете какво описва най-добре запитването ви.',
  },
  typeLegend: { en: 'What is your enquiry about?', bg: 'За какво е запитването?' },
  types: {
    general: {
      title: { en: 'General question', bg: 'Общ въпрос' },
      hint: {
        en: 'A question about a project, the site or anything technical.',
        bg: 'Въпрос за проект, за сайта или нещо техническо.',
      },
    },
    project: {
      title: { en: 'Discuss a project', bg: 'Обсъждане на проект' },
      hint: {
        en: 'A website, an app, an integration or custom software you want built.',
        bg: 'Сайт, приложение, интеграция или софтуер по поръчка.',
      },
    },
    opportunity: {
      title: { en: 'Job or collaboration', bg: 'Работа или сътрудничество' },
      hint: {
        en: 'A role, a contract or working together.',
        bg: 'Позиция, договор или съвместна работа.',
      },
    },
    other: {
      title: { en: 'Something else', bg: 'Нещо друго' },
      hint: {
        en: 'Anything that does not fit above.',
        bg: 'Всичко, което не пасва по-горе.',
      },
    },
  },
  fields: {
    name: { en: 'Your name', bg: 'Вашето име' },
    email: { en: 'Email', bg: 'Имейл' },
    emailHint: { en: 'I’ll reply to this address.', bg: 'Ще отговоря на този адрес.' },
    message: { en: 'Your message', bg: 'Вашето съобщение' },
    company: { en: 'Company', bg: 'Компания' },
    role: { en: 'Role or type of collaboration', bg: 'Позиция или вид сътрудничество' },
    opportunity: { en: 'Describe the opportunity', bg: 'Опишете възможността' },
    url: {
      en: 'Job posting or company link (optional)',
      bg: 'Обява или сайт на компанията (по желание)',
    },
    followUp: { en: 'How would you like to continue?', bg: 'Как предпочитате да продължим?' },
    objective: {
      en: 'What are you building or trying to accomplish?',
      bg: 'Какво изграждате или искате да постигнете?',
    },
    objectiveHint: {
      en: 'For example a company website, an online shop, an internal tool or an AI automation.',
      bg: 'Например фирмен сайт, онлайн магазин, вътрешен инструмент или автоматизация с ИИ.',
    },
    help: { en: 'What do you need help with?', bg: 'С какво ви трябва помощ?' },
    helpNote: { en: 'Anything to add? (optional)', bg: 'Нещо за добавяне? (по желание)' },
    stage: { en: 'Where are you in the process?', bg: 'На какъв етап сте?' },
    meeting: {
      en: 'What would you like to achieve in a 30-minute consultation? (optional)',
      bg: 'Какво искате да постигнем в 30-минутна консултация? (по желание)',
    },
    meetingHint: {
      en: 'For example: choose a technology stack, review an architecture, assess a feature.',
      bg: 'Например: избор на технологии, преглед на архитектура, оценка на функционалност.',
    },
  },
  help: {
    planning: { en: 'Technical planning', bg: 'Техническо планиране' },
    build: { en: 'Building the application', bg: 'Изработка на приложението' },
    improve: { en: 'Improving an existing product', bg: 'Подобряване на съществуващ продукт' },
    integrate: { en: 'Integrating external systems', bg: 'Интеграция с външни системи' },
    problem: { en: 'Solving a technical challenge', bg: 'Решаване на технически проблем' },
    architecture: { en: 'Evaluating an architecture', bg: 'Оценка на архитектура' },
  },
  stage: {
    idea: { en: 'Exploring an idea', bg: 'Проучвам идея' },
    requirements: { en: 'Planning requirements', bg: 'Планирам изискванията' },
    ready: { en: 'Ready to begin development', bg: 'Готов съм да започнем изработка' },
    building: { en: 'Already in development', bg: 'Вече е в разработка' },
    existing: { en: 'Improving an existing system', bg: 'Подобрявам съществуваща система' },
    problem: { en: 'Facing a specific technical problem', bg: 'Имам конкретен технически проблем' },
  },
  followUp: {
    email: { en: 'By email', bg: 'По имейл' },
    call: { en: 'On a call', bg: 'С разговор' },
    either: { en: 'Either works', bg: 'И двете' },
  },
  /** Field errors, keyed by the codes validateEnquiry() returns. */
  errors: {
    required: { en: 'This field is required.', bg: 'Полето е задължително.' },
    tooShort: { en: 'Please add a little more detail.', bg: 'Добавете малко повече подробности.' },
    tooLong: { en: 'This is too long.', bg: 'Текстът е твърде дълъг.' },
    invalidEmail: {
      en: 'Enter a complete email address, with an @ and a domain.',
      bg: 'Въведете пълен имейл адрес, с @ и домейн.',
    },
    invalidUrl: {
      en: 'Enter a full link starting with https://.',
      bg: 'Въведете пълен линк, който започва с https://.',
    },
    invalidChoice: { en: 'Choose one of the options.', bg: 'Изберете една от възможностите.' },
  },
  summary: { en: 'Please check the marked fields.', bg: 'Проверете отбелязаните полета.' },
  /** Submission failures; the text the visitor wrote always stays in the form. */
  failure: {
    rate: {
      en: 'Too many messages from your connection. Please try again in an hour, or email me directly.',
      bg: 'Твърде много съобщения от вашата връзка. Опитайте отново след час или ми пишете директно.',
    },
    network: {
      en: 'The message could not be sent. Everything you wrote is still here: try again, or email me directly.',
      bg: 'Съобщението не можа да бъде изпратено. Всичко написано е запазено: опитайте отново или ми пишете директно.',
    },
  },
  qualify: {
    readyTitle: {
      en: 'Ready to discuss the details?',
      bg: 'Готови ли сте да обсъдим подробностите?',
    },
    readyText: {
      en: 'You’ve outlined a specific project and meeting objective. You can schedule a free 30-minute consultation to discuss the next steps.',
      bg: 'Описахте конкретен проект и цел на срещата. Можете да запазите безплатна 30-минутна консултация, за да обсъдим следващите стъпки.',
    },
    messageTitle: {
      en: 'Prefer to start with a message?',
      bg: 'Предпочитате да започнем с писмо?',
    },
    messageText: {
      en: 'Send the details of your project. I’ll review them and follow up with the most appropriate next steps.',
      bg: 'Изпратете подробностите за проекта. Ще ги прегледам и ще предложа най-подходящите следващи стъпки.',
    },
    guidanceTitle: {
      en: 'A few details would make a call worthwhile',
      bg: 'Още няколко подробности ще направят разговора полезен',
    },
    guidanceText: {
      en: 'A consultation works best with a clear agenda. To be offered one, add:',
      bg: 'Консултацията е най-полезна с ясна програма. За да ви бъде предложена, добавете:',
    },
    guidanceAfter: {
      en: 'Or simply send your enquiry now: I read every one.',
      bg: 'Или просто изпратете запитването сега: чета всяко.',
    },
    missing: {
      objective: {
        en: 'What you’re building, in a sentence or two',
        bg: 'Какво изграждате, в едно-две изречения',
      },
      help: {
        en: 'The help you need (tick at least one)',
        bg: 'От каква помощ имате нужда (поне една отметка)',
      },
      stage: { en: 'The stage you’re at', bg: 'На какъв етап сте' },
      meeting: {
        en: 'What the consultation should achieve',
        bg: 'Какво трябва да постигне консултацията',
      },
    },
  },
  actions: {
    send: { en: 'Send message', bg: 'Изпратете съобщението' },
    sendOpportunity: { en: 'Send opportunity', bg: 'Изпратете възможността' },
    sendProject: { en: 'Send project enquiry', bg: 'Изпратете запитването' },
    sendInstead: { en: 'Send enquiry instead', bg: 'Само изпратете запитването' },
    schedule: {
      en: 'Send brief and schedule a consultation',
      bg: 'Изпратете описанието и запазете консултация',
    },
    sending: { en: 'Sending…', bg: 'Изпращане…' },
  },
  privacy: {
    en: 'Your details go by email to my inbox, only so I can reply. The site stores nothing and uses no trackers. If you book a call, Google Calendar handles that booking under Google’s own privacy terms.',
    bg: 'Данните ви отиват по имейл в моята поща, само за да ви отговоря. Сайтът не пази нищо и не използва тракери. Ако запазите разговор, резервацията се обработва от Google Calendar според условията на Google.',
  },
  noscript: {
    en: 'This form needs JavaScript. You can email me directly at the address above.',
    bg: 'Формата изисква JavaScript. Можете да ми пишете директно на адреса по-горе.',
  },
  sent: {
    title: { en: 'Message sent', bg: 'Съобщението е изпратено' },
    text: {
      en: 'Thank you. I’ll reply by email, usually within two working days. Your reference is {ref}.',
      bg: 'Благодаря! Ще отговоря по имейл, обикновено до два работни дни. Вашият номер е {ref}.',
    },
    another: { en: 'Send another message', bg: 'Изпратете ново съобщение' },
  },
  booking: {
    title: { en: 'Your project brief is sent', bg: 'Описанието на проекта е изпратено' },
    text: {
      en: 'Reference {ref}. Now choose a time for the free consultation.',
      bg: 'Номер {ref}. Сега изберете час за безплатната консултация.',
    },
    free: { en: 'Free', bg: 'Безплатно' },
    duration: { en: '30 minutes', bg: '30 минути' },
    times: {
      en: 'Available times come straight from my Google Calendar.',
      bg: 'Свободните часове идват директно от моя Google Calendar.',
    },
    truth: {
      en: 'The call is booked only when Google Calendar confirms it and emails you an invitation. You can cancel or reschedule from that email.',
      bg: 'Срещата е запазена едва когато Google Calendar я потвърди и ви изпрати покана по имейл. От същия имейл можете да я отмените или преместите.',
    },
    show: { en: 'Show available times here', bg: 'Покажете свободните часове тук' },
    showNote: {
      en: 'This loads Google’s booking page here, and Google may set its own cookies.',
      bg: 'Това зарежда страницата на Google тук и Google може да постави свои бисквитки.',
    },
    open: { en: 'Continue to Google Calendar', bg: 'Продължете към Google Calendar' },
    frameTitle: {
      en: 'Google Calendar booking page',
      bg: 'Страница за записване в Google Calendar',
    },
  },
} as const satisfies Record<string, L | Record<string, unknown>>;
