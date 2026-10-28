// The contact form's rules, shared by the site (the form script imports this
// file) and the mail agent's /contact endpoint, so the browser and the server
// can never disagree. Pure: no I/O, no dependencies.
//
// Qualification decides only whether the site *offers* the consultation step.
// It is a courtesy filter, not access control: the Google booking page is public.

export const CATEGORIES = ['general', 'project', 'opportunity', 'other'];
export const HELP = ['planning', 'build', 'improve', 'integrate', 'problem', 'architecture'];
export const STAGES = ['idea', 'requirements', 'ready', 'building', 'existing', 'problem'];
export const FOLLOW_UP = ['email', 'call', 'either'];
export const INTENTS = ['message', 'consultation'];

export const LIMITS = {
  name: 100,
  email: 254,
  message: 4000,
  objective: 4000,
  meeting: 2000,
  helpNote: 500,
  company: 150,
  role: 150,
  url: 500,
};

const text = (value) =>
  typeof value === 'string'
    ? value
        .replace(/\r\n?/g, '\n')
        .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
        .trim()
    : '';
const line = (value) => text(value).replace(/\s+/g, ' ');
const words = (value) => value.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/u;

/** Fields each category sends; anything else in the payload is ignored. */
const FIELDS = {
  general: ['message'],
  other: ['message'],
  opportunity: ['company', 'role', 'message', 'url', 'followUp'],
  project: ['objective', 'help', 'helpNote', 'stage', 'meeting', 'intent'],
};

/**
 * Checks a submission. Returns the cleaned value, or the error code of each
 * field: required, tooShort, tooLong, invalidEmail, invalidUrl, invalidChoice.
 */
export function validateEnquiry(input) {
  const data = input && typeof input === 'object' ? input : {};
  const errors = {};
  const category = CATEGORIES.includes(data.category) ? data.category : null;
  if (!category) return { ok: false, errors: { category: 'required' } };

  const value = { category, locale: data.locale === 'bg' ? 'bg' : 'en' };
  const need = (field, cleaned, { min = 1, max = LIMITS[field], required = true } = {}) => {
    if (!cleaned) {
      if (required) errors[field] = 'required';
      return;
    }
    if (cleaned.length > max) errors[field] = 'tooLong';
    else if (cleaned.length < min) errors[field] = 'tooShort';
    value[field] = cleaned;
  };

  need('name', line(data.name), { min: 2 });
  const email = line(data.email);
  need('email', email);
  if (email && !errors.email && !EMAIL.test(email)) errors.email = 'invalidEmail';

  const fields = FIELDS[category];
  if (fields.includes('message')) {
    need('message', text(data.message), { min: category === 'opportunity' ? 20 : 10 });
  }
  if (fields.includes('company')) need('company', line(data.company));
  if (fields.includes('role')) need('role', line(data.role));
  if (fields.includes('url')) {
    const url = line(data.url);
    if (url) {
      if (url.length > LIMITS.url) errors.url = 'tooLong';
      else if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(url)) errors.url = 'invalidUrl';
      else value.url = url;
    }
  }
  if (fields.includes('followUp') && data.followUp) {
    if (FOLLOW_UP.includes(data.followUp)) value.followUp = data.followUp;
    else errors.followUp = 'invalidChoice';
  }
  if (category === 'project') {
    need('objective', text(data.objective), { min: 10 });
    const help = Array.isArray(data.help) ? [...new Set(data.help)] : [];
    if (help.some((id) => !HELP.includes(id))) errors.help = 'invalidChoice';
    else value.help = help;
    need('helpNote', text(data.helpNote), { required: false });
    if (!value.help?.length && !value.helpNote && !errors.help) errors.help = 'required';
    if (!data.stage) errors.stage = 'required';
    else if (STAGES.includes(data.stage)) value.stage = data.stage;
    else errors.stage = 'invalidChoice';
    need('meeting', text(data.meeting), { required: false });
    value.intent = data.intent === 'consultation' ? 'consultation' : 'message';
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

// A meeting objective that only asks to talk, in either language. Matched only
// in a short answer, so a real objective that happens to say "talk" still counts.
const VAGUE =
  /\b(just (to )?chat|chatting|let'?s talk|have (some|a few) questions|know more|get to know|просто да (си )?поговорим|да си поговорим|имам (няколко )?въпроси|да науча повече|да се запознаем)/iu;

/**
 * Whether a project enquiry explains enough for a 30-minute consultation to
 * have an agenda: what is being built, the help needed, the current stage and
 * what the meeting should achieve. Explainable rules, no score: `missing` names
 * each part still needed, and the written enquiry is always available.
 * Nothing here depends on company size, budget or writing style.
 */
export function qualify(input) {
  const data = input && typeof input === 'object' ? input : {};
  const objective = text(data.objective);
  const meeting = text(data.meeting);
  const helpNote = text(data.helpNote);
  const help = Array.isArray(data.help) ? data.help.filter((id) => HELP.includes(id)) : [];
  const missing = [];
  if (objective.length < 25 || words(objective) < 3) missing.push('objective');
  if (!help.length && words(helpNote) < 3) missing.push('help');
  if (!STAGES.includes(data.stage)) missing.push('stage');
  const vague = VAGUE.test(meeting) && words(meeting) < 10;
  if (meeting.length < 25 || words(meeting) < 4 || vague) missing.push('meeting');
  return { qualified: missing.length === 0, missing };
}

/** A short reference for follow-up, not an identifier of anything stored. */
export const makeReference = (random) =>
  `NG-${Array.from(random(6), (byte) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[byte % 32]).join('')}`;

const LABEL = {
  category: {
    general: 'General question',
    project: 'Project',
    opportunity: 'Job or collaboration',
    other: 'Something else',
  },
  help: {
    planning: 'Technical planning',
    build: 'Building the application',
    improve: 'Improving an existing product',
    integrate: 'Integrating external systems',
    problem: 'Solving a technical challenge',
    architecture: 'Evaluating an architecture',
  },
  stage: {
    idea: 'Exploring an idea',
    requirements: 'Planning requirements',
    ready: 'Ready to begin development',
    building: 'Already in development',
    existing: 'Improving an existing system',
    problem: 'Facing a specific technical problem',
  },
  followUp: { email: 'Email', call: 'A call', either: 'Either' },
};

/**
 * The email Nikolay receives: plain text only, so nothing a visitor types can
 * become markup, and a subject with no line breaks, so no header injection.
 */
export function formatEnquiryEmail(value, reference) {
  const kind = LABEL.category[value.category];
  const subject = `[Website] ${kind}: ${value.name}`.replace(/[\r\n]+/g, ' ').slice(0, 150);
  const lines = [
    `New enquiry from nikolay-georgiev.dev (reference ${reference})`,
    '',
    `Type: ${kind}`,
    `Name: ${value.name}`,
    `Email: ${value.email} (typed into the form, not verified)`,
    `Page language: ${value.locale === 'bg' ? 'Bulgarian' : 'English'}`,
  ];
  if (value.category === 'project') {
    const fit = qualify(value);
    lines.push(
      `Chose: ${value.intent === 'consultation' ? 'brief + booking page' : 'written enquiry'}`,
      `Consultation agenda complete: ${fit.qualified ? 'yes' : `no (missing: ${fit.missing.join(', ')})`}`,
      '',
      'What they are building:',
      value.objective,
      '',
      `Help needed: ${value.help.map((id) => LABEL.help[id]).join(', ') || '(none ticked)'}`,
    );
    if (value.helpNote) lines.push(`In their words: ${value.helpNote}`);
    lines.push(`Stage: ${LABEL.stage[value.stage]}`);
    if (value.meeting) lines.push('', 'What the consultation should achieve:', value.meeting);
  } else {
    if (value.company) lines.push(`Company: ${value.company}`);
    if (value.role) lines.push(`Role or collaboration: ${value.role}`);
    if (value.url) lines.push(`Link: ${value.url}`);
    if (value.followUp) lines.push(`Prefers to continue by: ${LABEL.followUp[value.followUp]}`);
    lines.push('', 'Message:', value.message);
  }
  lines.push(
    '',
    '---',
    'Reply to this email to answer them: Reply-To is their address.',
    'A booking, if they make one, arrives separately from Google Calendar.',
  );
  return { subject, text: lines.join('\n') };
}
