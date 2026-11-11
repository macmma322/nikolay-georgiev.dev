// The workspace's only behaviour: chat streaming, live preview, a little markdown,
// the phone menu, and leaving nothing usable behind once the session is gone.
const BASE = '/workspace/contracts';
const escape = (text) => text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

// A page brought back by Back/Forward is a copy from before; ask the server
// again, which sends a signed-out browser to sign-in instead of showing it.
addEventListener('pageshow', (event) => {
  if (event.persisted) location.reload();
});
// Browsers that keep no-store pages in that cache (Safari) keep an empty one.
addEventListener('pagehide', (event) => {
  if (event.persisted) document.getElementById('main')?.replaceChildren();
});

// Any request refused for want of a session: clear the screen, then sign in.
const signedOut = () => {
  document.getElementById('main')?.replaceChildren();
  location.replace(`${BASE}/login?expired=1`);
};

// The phone menu (the portfolio's SiteHeader behaviour): a native popover;
// while open the page behind is inert and Tab wraps inside it.
const menu = document.getElementById('studio-menu');
if (menu) {
  const setPageInert = (inert) =>
    document
      .querySelectorAll('.skip-link, .site-header > .bar, main')
      .forEach((el) => (el.inert = inert));
  menu.addEventListener('beforetoggle', (event) => {
    if (event.newState === 'closed') setPageInert(false);
  });
  menu.addEventListener('toggle', (event) => {
    if (event.newState !== 'open') return;
    menu.querySelector('.mobile-list a')?.focus();
    setPageInert(true);
  });
  menu.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const items = menu.querySelectorAll('a[href], button');
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  matchMedia('(min-width: 1240px)').addEventListener('change', (event) => {
    if (event.matches && menu.matches(':popover-open')) menu.hidePopover();
  });
}

// Escapes first, then adds a small allowlist of tags: model text never reaches
// the page as HTML of its own.
function markdown(source) {
  const inline = (line) =>
    line.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const out = [];
  let list = false;
  for (const line of escape(source).split('\n')) {
    const item = line.match(/^\s*[-*]\s+(.*)$/);
    if (item) {
      if (!list) out.push('<ul>');
      list = true;
      out.push(`<li>${inline(item[1])}</li>`);
      continue;
    }
    if (list) out.push('</ul>');
    list = false;
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (heading) out.push(`<h4>${inline(heading[1])}</h4>`);
    else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push('</ul>');
  return out.join('');
}
document.querySelectorAll('.md').forEach((node) => {
  node.innerHTML = markdown(node.textContent);
});

document.getElementById('print')?.addEventListener('click', () => print());

const edit = document.getElementById('edit-form');
const preview = document.getElementById('preview');
if (edit && preview) {
  let timer;
  let controller;
  edit.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(edit.dataset.preview, {
          method: 'POST',
          body: new URLSearchParams(new FormData(edit)),
          signal: controller.signal,
        });
        if (response.status === 401) return signedOut();
        if (response.ok) preview.innerHTML = await response.text();
      } catch (error) {
        if (error.name !== 'AbortError') console.warn('Preview failed');
      }
    }, 350);
  });
}

const chat = document.getElementById('chat');
if (chat) {
  const log = document.getElementById('log');
  const stop = document.getElementById('stop');
  const send = document.getElementById('send');
  const status = document.getElementById('chat-status');
  const field = document.getElementById('message');
  let controller = null;

  const bubble = (role, text) => {
    const node = document.createElement('div');
    node.className = `msg ${role}`;
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = role === 'user' ? 'You' : 'Claude';
    const body = document.createElement('div');
    body.className = 'md';
    body.innerHTML = markdown(text);
    node.append(who, body);
    log.append(node);
    log.scrollTop = log.scrollHeight;
    return body;
  };

  const busy = (on) => {
    send.disabled = on;
    stop.hidden = !on;
    status.textContent = on ? 'Claude is writing…' : '';
  };

  stop.addEventListener('click', () => controller?.abort());
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) chat.requestSubmit();
  });

  chat.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = field.value.trim();
    if (!message) return;
    field.value = '';
    bubble('user', message);
    const output = bubble('assistant', '');
    let text = '';
    let reload = false;
    controller = new AbortController();
    busy(true);
    try {
      const response = await fetch(chat.dataset.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });
      if (response.status === 401) return signedOut();
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Claude could not complete that request.');
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines.filter(Boolean)) {
          const item = JSON.parse(line);
          if (item.t === 'text') {
            text += item.d;
            output.innerHTML = markdown(text);
            log.scrollTop = log.scrollHeight;
          } else if (item.t === 'proposal' || item.t === 'scope') {
            reload = true;
          } else if (item.t === 'error' || item.t === 'rejected') {
            output.insertAdjacentHTML(
              'beforeend',
              `<p class="bad">${escape(item.message ?? item.reason)}</p>`,
            );
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        output.insertAdjacentHTML('beforeend', '<p class="muted">Stopped.</p>');
      } else {
        output.insertAdjacentHTML('beforeend', `<p class="bad">${escape(error.message)}</p>`);
      }
    } finally {
      busy(false);
      controller = null;
    }
    // Server-rendered cards are the only way a proposal appears, so a reload shows it.
    if (reload) location.reload();
  });
}

const addPasskey = document.getElementById('add-passkey');
if (addPasskey) {
  const { createPasskey, guard } = await import('./auth.js');
  addPasskey.addEventListener(
    'click',
    guard(() =>
      createPasskey('/settings/passkeys', { label: prompt('Name this passkey') ?? 'Passkey' }),
    ),
  );
}
