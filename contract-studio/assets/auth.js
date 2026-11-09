// Passkey ceremonies, using the browser's own JSON helpers.
const BASE = '/workspace/contracts';
const message = document.getElementById('auth-message');
const show = (text) => {
  if (!message) return;
  message.textContent = text;
  message.hidden = false;
};
const post = async (path, body) => {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? 'That did not work.');
  return data;
};
const guard = (work) => (event) => {
  event.preventDefault();
  if (message) message.hidden = true;
  work(event).catch((error) => {
    show(error.name === 'NotAllowedError' ? 'Passkey request was cancelled.' : error.message);
  });
};

async function createPasskey(prefix, extra) {
  const { options, challengeId } = await post(`${prefix}/options`, extra);
  const credential = await navigator.credentials.create({
    publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options),
  });
  const done = await post(`${prefix}/verify`, {
    ...extra,
    challengeId,
    response: credential.toJSON(),
  });
  location.assign(done.next);
}

document.getElementById('login')?.addEventListener(
  'click',
  guard(async () => {
    const { options, challengeId } = await post('/auth/options');
    const credential = await navigator.credentials.get({
      publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options),
    });
    const done = await post('/auth/verify', { challengeId, response: credential.toJSON() });
    location.assign(done.next);
  }),
);

document.getElementById('setup')?.addEventListener(
  'submit',
  guard(async (event) => {
    const data = new FormData(event.target);
    await createPasskey('/setup', { token: data.get('token'), label: data.get('label') });
  }),
);

export { createPasskey, guard };
